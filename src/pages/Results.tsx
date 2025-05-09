import React, { useState } from 'react';
import {
  Box, Heading, Text, VStack, Divider, Table, Thead, Tbody, Tr, Th, Td, Card, CardBody, Badge, List, ListItem, ListIcon, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, Alert, AlertIcon, Button, IconButton, Tooltip, Flex
} from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CheckCircleIcon, WarningIcon, ChatIcon } from '@chakra-ui/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChatInterface } from '../components/ChatInterface';

// Helper for pie chart colors
const COLORS = ['#3182ce', '#63b3ed', '#90cdf4', '#2b6cb0', '#4fd1c5', '#f6ad55', '#e53e3e', '#38a169'];

type SectionProps = { title: string; children: React.ReactNode };
const Section = ({ title, children }: SectionProps) => (
  <Box mb={10}>
    <Heading size="md" mb={2}>{title}</Heading>
    <Divider mb={4} />
    {children}
  </Box>
);

type BenefitsBarChartProps = { data: any[] };
const BenefitsBarChart = ({ data }: BenefitsBarChartProps) => {
  // Only use numeric sublimits for the chart
  const numericData = data.filter(
    (b: any) => !isNaN(Number(b.sublimit_details?.sublimit_amount)) && b.sublimit_details?.sublimit_amount !== ''
  ).map((b: any) => ({
    ...b,
    sublimit_details: {
      ...b.sublimit_details,
      sublimit_amount: Number(b.sublimit_details?.sublimit_amount)
    }
  }));

  if (numericData.length === 0) {
    return;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={numericData}>
        <XAxis dataKey="benefit_name" />
        <YAxis />
        <RechartsTooltip />
        <Bar dataKey="sublimit_details.sublimit_amount" name="Sublimit Amount">
          {numericData.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

type PieChartSimpleProps = { data: any[]; dataKey: string; nameKey: string };
const PieChartSimple = ({ data, dataKey, nameKey }: PieChartSimpleProps) => (
  <ResponsiveContainer width="100%" height={250}>
    <PieChart>
      <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={80} label>
        {data.map((entry: any, index: number) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <RechartsTooltip />
    </PieChart>
  </ResponsiveContainer>
);

// Helper to display value or N/A
const display = (val: any) => {
  if (val === undefined || val === null) return 'N/A';
  if (typeof val === 'string' && val.trim() === '') return 'N/A';
  if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : 'N/A';
  return val;
};

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Defensive: parse Gemini result content
  let parsed: any = null;
  let parseError = '';
  if (!result) {
    navigate('/dashboard');
    return null;
  }
  try {
    parsed = typeof result.content === 'string' ? JSON.parse(result.content) : result.content;
  } catch (e) {
    parseError = 'Failed to parse Gemini result JSON.';
  }

  if (parseError) {
    return (
      <Alert status="error" mt={8}>
        <AlertIcon />
        {parseError}
      </Alert>
    );
  }

  // Extract from nested Gemini output structure
  const results = parsed.results || {};
  const parentContext = parsed.parentContext || {};

  // Create complete context object for chat
  const completeContext = {
    parentContext,
    results: {
      policyvariants: results.policyvariants?.content,
      policydesign: results.policydesign?.content,
      permanentexclusions: results.permanentexclusions?.content,
      hospitalizationexpensecoverage: results.hospitalizationexpensecoverage?.content,
      maternityfeatures: results.maternityfeatures?.content,
      premiumreduction: results.premiumreduction?.content,
      treatmentcoverage: results.treatmentcoverage?.content,
      nontreatmentbenefits: results.nontreatmentbenefits?.content,
      optionalbenefits: results.optionalbenefits?.content,
      policyholderobligations: results.policyholderobligations?.content,
      benefitshavingsublimits: results.benefitshavingsublimits?.content,
      exclusionswithwaitingperiods: results.exclusionswithwaitingperiods?.content,
      sienhancement: results.sienhancement?.content
    }
  };

  // Extract from nested Gemini output structure
  const policy_variants = results.policyvariants?.content?.policy_variants || {};
  const policy_design = results.policydesign?.content?.policy_design || {};
  const permanent_exclusions = results.permanentexclusions?.content?.permanent_exclusions || {};
  const hospitalization_expense_coverage = results.hospitalizationexpensecoverage?.content?.hospitalization_expense_coverage || {};
  const maternity_features = results.maternityfeatures?.content?.maternity_features || {};
  const premium_reduction = results.premiumreduction?.content?.premium_reduction || {};
  const treatment_coverage = results.treatmentcoverage?.content?.treatment_coverage || {};
  const non_treatment_benefits = results.nontreatmentbenefits?.content?.non_treatment_benefits || {};
  const optional_addon_benefits = results.optionalbenefits?.content?.optional_addon_benefits || [];
  const policyholder_obligations = results.policyholderobligations?.content?.policyholder_obligations || [];
  const benefits_with_sublimits = results.benefitshavingsublimits?.content?.benefits_with_sublimits || [];
  const exclusions_with_waiting_periods = results.exclusionswithwaitingperiods?.content?.exclusions_with_waiting_periods || {};
  const si_enhancement = results.sienhancement?.content?.si_enhancement || {};

  // Helper for empty state
  const renderNoData = (colSpan: number) => (
    <Tr><Td colSpan={colSpan}><i>No data found for this section.</i></Td></Tr>
  );

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Main Analysis Content - 75% */}
      <Box 
        flex="3"
        p={8} 
        overflowY="auto"
        borderRight={isChatOpen ? "1px" : "0"}
        borderColor="gray.200"
      >
        <Flex justify="space-between" align="center" mb={6}>
          <Heading>Policy Analysis Results</Heading>
          <Tooltip label={isChatOpen ? "Close chat" : "Chat with your document"}>
            <IconButton
              aria-label="Toggle chat"
              icon={<ChatIcon />}
              colorScheme="blue"
              onClick={() => setIsChatOpen(!isChatOpen)}
            />
          </Tooltip>
        </Flex>

        <VStack align="stretch" spacing={8}>
          {/* Policy Variants */}
          <Section title="Unique Features">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Variant</Th>
                  <Th>Description</Th>
                  <Th>Target</Th>
                  <Th>Unique Features</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Array.isArray(policy_variants.variant_details) && policy_variants.variant_details.length > 0 ? policy_variants.variant_details.map((v: any, i: number) => (
                  <Tr key={i}>
                    <Td>{display(v.variant_name)}</Td>
                    <Td>{display(v.variant_description)}</Td>
                    <Td>{display(v.target_demographic)}</Td>
                    <Td>{display(v.unique_features?.join(', '))}</Td>
                  </Tr>
                )) : renderNoData(4)}
              </Tbody>
            </Table>
          </Section>
          {/* Benefits with Sublimits */}
          <Section title="Benefits with Sublimits">
            <Text mb={4}>Key benefits and their sublimits as extracted from your policy.</Text>
            <BenefitsBarChart data={benefits_with_sublimits} />
            <Table variant="simple" mt={6}>
              <Thead>
                <Tr>
                  <Th>Benefit Name</Th>
                  <Th>Sublimit Amount</Th>
                  <Th>Sublimit Type</Th>
                  <Th>Covered Items</Th>
                  <Th>Exclusions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Array.isArray(benefits_with_sublimits) && benefits_with_sublimits.length > 0 ? benefits_with_sublimits.map((b: any, i: number) => (
                  <Tr key={i}>
                    <Td>{display(b.benefit_name)}</Td>
                    <Td>{display(b.sublimit_details?.sublimit_amount)}</Td>
                    <Td>{display(b.sublimit_details?.sublimit_type)}</Td>
                    <Td>{display(b.coverage?.covered_items)}</Td>
                    <Td>{display(b.coverage?.exclusions)}</Td>
                  </Tr>
                )) : renderNoData(5)}
              </Tbody>
            </Table>
          </Section>

          {/* Exclusions with Waiting Periods */}
          <Section title="Exclusions with Waiting Periods">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Type</Th>
                  <Th>Duration</Th>
                  <Th>Details</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Initial Waiting Period</Td>
                  <Td>{display(exclusions_with_waiting_periods.initial_waiting_period?.duration)}</Td>
                  <Td>{display(exclusions_with_waiting_periods.initial_waiting_period?.excluded_expenses?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Pre-existing Diseases</Td>
                  <Td>{display(exclusions_with_waiting_periods.pre_existing_diseases_waiting_period?.duration)}</Td>
                  <Td>{display(exclusions_with_waiting_periods.pre_existing_diseases_waiting_period?.definition)}</Td>
                </Tr>
                <Tr>
                  <Td>Specified Diseases</Td>
                  <Td>{display(exclusions_with_waiting_periods.specified_diseases_procedures_waiting_period?.duration)}</Td>
                  <Td>{display(exclusions_with_waiting_periods.specified_diseases_procedures_waiting_period?.included_diseases_procedures?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Maternity</Td>
                  <Td>{display(exclusions_with_waiting_periods.maternity_waiting_period?.duration)}</Td>
                  <Td>{display(exclusions_with_waiting_periods.maternity_waiting_period?.covered_expenses?.join(', '))}</Td>
                </Tr>
              </Tbody>
            </Table>
          </Section>

          {/* Hospitalization Expense Coverage */}
          <Section title="Hospitalization Expense Coverage">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Type</Th>
                  <Th>Coverage Amount</Th>
                  <Th>Details</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>In-patient Care</Td>
                  <Td>{display(hospitalization_expense_coverage.in_patient_care?.coverage_amount)}</Td>
                  <Td>{display(hospitalization_expense_coverage.in_patient_care?.expenses_covered?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Pre-hospitalization</Td>
                  <Td>{display(hospitalization_expense_coverage.pre_hospitalization_expenses?.coverage_amount)}</Td>
                  <Td>{display(hospitalization_expense_coverage.pre_hospitalization_expenses?.expenses_covered?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Post-hospitalization</Td>
                  <Td>{display(hospitalization_expense_coverage.post_hospitalization_expenses?.coverage_amount)}</Td>
                  <Td>{display(hospitalization_expense_coverage.post_hospitalization_expenses?.expenses_covered?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Room Rent</Td>
                  <Td>{display(hospitalization_expense_coverage.room_rent_eligibility?.limit_value)}</Td>
                  <Td>{display(hospitalization_expense_coverage.room_rent_eligibility?.limit_type)}</Td>
                </Tr>
                <Tr>
                  <Td>ICU Rent</Td>
                  <Td>{display(hospitalization_expense_coverage.icu_rent_capping?.limit_value)}</Td>
                  <Td>{display(hospitalization_expense_coverage.icu_rent_capping?.limit_type)}</Td>
                </Tr>
                <Tr>
                  <Td>Ambulance (Road)</Td>
                  <Td>{display(hospitalization_expense_coverage.road_ambulance?.coverage_amount)}</Td>
                  <Td>{display(hospitalization_expense_coverage.road_ambulance?.coverage_basis)}</Td>
                </Tr>
                <Tr>
                  <Td>Ambulance (Air)</Td>
                  <Td>{display(hospitalization_expense_coverage.air_ambulance?.coverage_amount)}</Td>
                  <Td>{display(hospitalization_expense_coverage.air_ambulance?.coverage_basis)}</Td>
                </Tr>
              </Tbody>
            </Table>
          </Section>

          {/* Maternity Features */}
          <Section title="Maternity Features">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Type</Th>
                  <Th>Coverage Amount</Th>
                  <Th>Waiting Period</Th>
                  <Th>Details</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Maternity</Td>
                  <Td>{display(maternity_features.maternity_coverage?.coverage_amount)}</Td>
                  <Td>{display(maternity_features.maternity_coverage?.waiting_period)}</Td>
                  <Td>{display(maternity_features.maternity_coverage?.coverage_type)}</Td>
                </Tr>
                <Tr>
                  <Td>Newborn</Td>
                  <Td>{display(maternity_features.newborn_baby_cover?.coverage_amount)}</Td>
                  <Td>{display(maternity_features.newborn_baby_cover?.waiting_period)}</Td>
                  <Td>{display(maternity_features.newborn_baby_cover?.coverage_start)}</Td>
                </Tr>
                <Tr>
                  <Td>IVF</Td>
                  <Td>{display(maternity_features.ivf_coverage?.coverage_amount)}</Td>
                  <Td>{display(maternity_features.ivf_coverage?.waiting_period)}</Td>
                  <Td>-</Td>
                </Tr>
              </Tbody>
            </Table>
          </Section>

          {/* Non-Treatment Benefits */}
          <Section title="Non-Treatment Benefits">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Benefit</Th>
                  <Th>Amount</Th>
                  <Th>Details</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Daily Hospitalization Cash</Td>
                  <Td>{display(non_treatment_benefits.daily_hospitalization_cash?.benefit_amount)}</Td>
                  <Td>{display(non_treatment_benefits.daily_hospitalization_cash?.waiting_period)}</Td>
                </Tr>
                <Tr>
                  <Td>Shared Accommodation</Td>
                  <Td>{display(non_treatment_benefits.shared_accommodation_benefit?.benefit_amount)}</Td>
                  <Td>{display(non_treatment_benefits.shared_accommodation_benefit?.trigger_conditions?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>OPD Treatment</Td>
                  <Td>{display(non_treatment_benefits.opd_treatment?.coverage_amount)}</Td>
                  <Td>{display(non_treatment_benefits.opd_treatment?.covered_services?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Annual Health Checkup</Td>
                  <Td>-</Td>
                  <Td>{display(non_treatment_benefits.annual_health_checkup?.coverage_details)}</Td>
                </Tr>
                <Tr>
                  <Td>Doctor Consultation</Td>
                  <Td>-</Td>
                  <Td>{display(non_treatment_benefits.doctor_consultation?.consultation_types?.join(', '))}</Td>
                </Tr>
              </Tbody>
            </Table>
          </Section>

          {/* Optional Addon Benefits */}
          <Section title="Optional Addon Benefits">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Summary</Th>
                  <Th>Coverage Amount</Th>
                  <Th>Waiting Period</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Array.isArray(optional_addon_benefits) && optional_addon_benefits.length > 0 ? optional_addon_benefits.map((b: any, i: number) => (
                  <Tr key={i}>
                    <Td>{display(b.benefit_name)}</Td>
                    <Td>{display(b.benefit_type)}</Td>
                    <Td>{display(b.benefit_summary)}</Td>
                    <Td>{display(b.coverage_details?.coverage_amount)}</Td>
                    <Td>{display(b.waiting_period?.duration)}</Td>
                  </Tr>
                )) : renderNoData(5)}
              </Tbody>
            </Table>
          </Section>

          {/* Permanent Exclusions */}
          <Section title="Permanent Exclusions">
            <Accordion allowToggle>
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">Standard Permanent Exclusions</Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel>
                  <List spacing={2}>
                    {Array.isArray(permanent_exclusions.standard_permanent_exclusions) && permanent_exclusions.standard_permanent_exclusions.length > 0 ? permanent_exclusions.standard_permanent_exclusions.map((e: any, i: number) => (
                      <ListItem key={i}><ListIcon as={WarningIcon} color="red.500" />{display(e.exclusion_description)}</ListItem>
                    )) : <ListItem><i>No data found for this section.</i></ListItem>}
                  </List>
                </AccordionPanel>
              </AccordionItem>
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">Non-Standard Permanent Exclusions</Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel>
                  <List spacing={2}>
                    {Array.isArray(permanent_exclusions.non_standard_permanent_exclusions) && permanent_exclusions.non_standard_permanent_exclusions.length > 0 ? permanent_exclusions.non_standard_permanent_exclusions.map((e: any, i: number) => (
                      <ListItem key={i}><ListIcon as={WarningIcon} color="orange.500" />{display(e.exclusion_description)}</ListItem>
                    )) : <ListItem><i>No data found for this section.</i></ListItem>}
                  </List>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Section>

          {/* Policy Design */}
          <Section title="Policy Design">
            <Card mb={4}><CardBody>
              <Text><b>Sum Insured Options:</b> {display(policy_design.base_sum_insured?.options?.join(', '))}</Text>
              <Text><b>Coverage Types:</b> {display(policy_design.coverage_type?.types?.join(', '))}</Text>
              <Text><b>Age Eligibility (Adult):</b> {display(policy_design.age_eligibility?.adult?.minimum_age)} - {display(policy_design.age_eligibility?.adult?.maximum_age)}</Text>
              <Text><b>Members Allowed (Individual):</b> {display(policy_design.members_allowed?.individual_policy?.max_adults)} adults, {display(policy_design.members_allowed?.individual_policy?.max_children)} children</Text>
              <Text><b>Relationships Allowed (Floater):</b> {display(policy_design.relationships_allowed?.family_floater?.join(', '))}</Text>
              <Text><b>Maximum Renewal Age (Floater):</b> {display(policy_design.maximum_renewal_age?.family_floater?.adults)}</Text>
              <Text><b>Zonal Pricing:</b> {display(policy_design.zonal_pricing?.zones?.join(', '))} (Impact: {display(policy_design.zonal_pricing?.premium_impact?.join(', '))})</Text>
              <Text><b>Policy Tenure Options:</b> {display(policy_design.policy_tenure?.options?.join(', '))}</Text>
              <Text><b>Premium Payment Cycle:</b> {display(policy_design.premium_payment_cycle?.options?.join(', '))}</Text>
            </CardBody></Card>
          </Section>

          {/* Policyholder Obligations */}
          <Section title="Policyholder Obligations">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Category</Th>
                  <Th>Stage</Th>
                  <Th>Summary</Th>
                  <Th>Purpose</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Array.isArray(policyholder_obligations) && policyholder_obligations.length > 0 ? policyholder_obligations.map((o: any, i: number) => (
                  <Tr key={i}>
                    <Td>{display(o.obligation_name)}</Td>
                    <Td>{display(o.obligation_category)}</Td>
                    <Td>{display(o.policy_lifecycle_stage)}</Td>
                    <Td>{display(o.obligation_summary)}</Td>
                    <Td>{display(o.purpose)}</Td>
                  </Tr>
                )) : renderNoData(5)}
              </Tbody>
            </Table>
          </Section>

          {/* Premium Reduction */}
          <Section title="Premium Reduction">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Type</Th>
                  <Th>Discount</Th>
                  <Th>Details</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Tenure Discount</Td>
                  <Td>{display(Object.values(premium_reduction.tenure_discount?.discount_percentages || {}).join(', '))}</Td>
                  <Td>{display(premium_reduction.tenure_discount?.application_method)}</Td>
                </Tr>
                <Tr>
                  <Td>Network Hospital Restriction</Td>
                  <Td>{display(premium_reduction.network_hospital_restriction?.discount_percentage)}</Td>
                  <Td>{display(premium_reduction.network_hospital_restriction?.non_network_impact)}</Td>
                </Tr>
                <Tr>
                  <Td>Room Rent Modification</Td>
                  <Td>{display(Object.values(premium_reduction.room_rent_modification?.discount_percentages || {}).join(', '))}</Td>
                  <Td>{display(premium_reduction.room_rent_modification?.available_categories?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Optional Copayment</Td>
                  <Td>{display(Object.values(premium_reduction.optional_copayment?.corresponding_discounts || {}).join(', '))}</Td>
                  <Td>{display(premium_reduction.optional_copayment?.available_percentages?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Annual Aggregate Deductible</Td>
                  <Td>{display(Object.values(premium_reduction.annual_aggregate_deductible?.corresponding_discounts || {}).join(', '))}</Td>
                  <Td>{display(premium_reduction.annual_aggregate_deductible?.available_amounts?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Healthy Life Discount</Td>
                  <Td>{display(Object.values(premium_reduction.healthy_life_discount?.discount_percentages || {}).join(', '))}</Td>
                  <Td>{display(premium_reduction.healthy_life_discount?.monitored_parameters?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Premium Lock</Td>
                  <Td>{display(premium_reduction.premium_lock?.locking_mechanism)}</Td>
                  <Td>{display(premium_reduction.premium_lock?.lock_duration)} years</Td>
                </Tr>
              </Tbody>
            </Table>
          </Section>

          {/* SI Enhancement */}
          <Section title="Sum Insured Enhancement">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Feature</Th>
                  <Th>Details</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Restore/Reset</Td>
                  <Td>{display(si_enhancement.restore_reset_sum_insured?.restoration_mechanism)} ({display(si_enhancement.restore_reset_sum_insured?.restoration_amount)})</Td>
                </Tr>
                <Tr>
                  <Td>No Claim Bonus</Td>
                  <Td>{display(si_enhancement.no_claim_bonus?.bonus_type)} ({display(si_enhancement.no_claim_bonus?.bonus_amount)})</Td>
                </Tr>
                <Tr>
                  <Td>Utilization Sequence</Td>
                  <Td>{display(si_enhancement.utilization_sequence?.sequence_order?.join(' → '))}</Td>
                </Tr>
                <Tr>
                  <Td>Additional Features</Td>
                  <Td>{display(si_enhancement.additional_enhancement_features?.map((f: any) => f.feature_name))}</Td>
                </Tr>
              </Tbody>
            </Table>
          </Section>

          {/* Treatment Coverage */}
          <Section title="Treatment Coverage">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Type</Th>
                  <Th>Coverage Amount</Th>
                  <Th>Covered</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Day Care</Td>
                  <Td>{display(treatment_coverage.day_care_treatments?.coverage_amount)}</Td>
                  <Td>{display(treatment_coverage.day_care_treatments?.covered_procedures?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Organ Transplant</Td>
                  <Td>{display(treatment_coverage.organ_transplant?.coverage_amount)}</Td>
                  <Td>{display(treatment_coverage.organ_transplant?.covered_organs?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Modern Treatments</Td>
                  <Td>{display(treatment_coverage.modern_treatments?.coverage_amount)}</Td>
                  <Td>{display(treatment_coverage.modern_treatments?.covered_procedures?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Alternative Treatments</Td>
                  <Td>{display(treatment_coverage.alternative_treatments?.coverage_amount)}</Td>
                  <Td>{display(treatment_coverage.alternative_treatments?.covered_systems?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Artificial Life Maintenance</Td>
                  <Td>{display(treatment_coverage.artificial_life_maintenance?.coverage_amount)}</Td>
                  <Td>{display(treatment_coverage.artificial_life_maintenance?.covered_situations?.join(', '))}</Td>
                </Tr>
                <Tr>
                  <Td>Mental Disorders</Td>
                  <Td>{display(treatment_coverage.mental_disorders_treatment?.coverage_amount)}</Td>
                  <Td>{display(treatment_coverage.mental_disorders_treatment?.covered_conditions?.join(', '))}</Td>
                </Tr>
              </Tbody>
            </Table>
          </Section>
        </VStack>
      </Box>

      {/* Chat Interface - 25% */}
      {isChatOpen && (
        <Box flex="1" borderLeft="1px" borderColor="gray.200">
          <ChatInterface
            documentContext={completeContext}
            isOpen={true}
          />
        </Box>
      )}
    </Flex>
  );
};

export default Results; 