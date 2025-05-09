import React, { useState, useRef } from 'react';
import {
  Box, Heading, Text, VStack, Divider, Table, Thead, Tbody, Tr, Th, Td, Card, CardBody, Badge, 
  List, ListItem, ListIcon, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, 
  Alert, AlertIcon, Button, IconButton, Tooltip, Flex, Tabs, TabList, Tab, TabPanels, TabPanel,
  Grid, GridItem, useColorModeValue, HStack, Tag, Stat, StatLabel, StatNumber, StatHelpText,
  Link, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Progress, Menu, MenuButton, MenuList, MenuItem
} from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { CheckCircleIcon, WarningIcon, ChatIcon, DownloadIcon, InfoIcon, ExternalLinkIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { FaLanguage } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChatInterface } from '../components/ChatInterface';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Helper for pie chart colors
const COLORS = ['#3182ce', '#63b3ed', '#90cdf4', '#2b6cb0', '#4fd1c5', '#f6ad55', '#e53e3e', '#38a169'];

// Professional section component with improved styling
type SectionProps = { 
  title: string; 
  icon?: React.ReactElement;
  children: React.ReactNode; 
  description?: string;
};

const Section = ({ title, icon, children, description }: SectionProps) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('blue.100', 'blue.700');
  const headerBg = useColorModeValue('blue.50', 'blue.900');
  
  return (
    <Box 
      mb={8} 
      bg={bgColor} 
      borderRadius="lg" 
      boxShadow="sm" 
      border="1px" 
      borderColor={borderColor}
      overflow="hidden"
    >
      <Box 
        p={4} 
        borderBottom="1px" 
        borderColor="inherit" 
        bg={headerBg}
      >
        <HStack>
          {icon}
          <Heading size="md">{title}</Heading>
        </HStack>
        {description && (
          <Text fontSize="sm" mt={1} color={useColorModeValue('gray.600', 'gray.400')}>
            {description}
          </Text>
        )}
      </Box>
      <Box p={4}>
    {children}
      </Box>
  </Box>
);
};

// Improved chart component with legend and better styling
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
    return <Text>No chart data available</Text>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={numericData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
        <XAxis dataKey="benefit_name" angle={-45} textAnchor="end" height={80} />
        <YAxis />
        <RechartsTooltip />
        <Legend />
        <Bar dataKey="sublimit_details.sublimit_amount" name="Sublimit Amount" fill="#3182ce">
          {numericData.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

type PieChartSimpleProps = { data: any[]; dataKey: string; nameKey: string; title: string };
const PieChartSimple = ({ data, dataKey, nameKey, title }: PieChartSimpleProps) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie 
        data={data} 
        dataKey={dataKey} 
        nameKey={nameKey} 
        cx="50%" 
        cy="50%" 
        outerRadius={100} 
        labelLine={true}
        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
      >
        {data.map((entry: any, index: number) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Legend />
      <RechartsTooltip />
    </PieChart>
  </ResponsiveContainer>
);

// Helper to display value or N/A with better formatting
const display = (val: any) => {
  if (val === undefined || val === null) return 'N/A';
  if (typeof val === 'string' && val.trim() === '') return 'N/A';
  if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : 'N/A';
  return val;
};

// Helper for creating benefit tags
const BenefitTag = ({ text, isPositive = true }: { text: string, isPositive?: boolean }) => (
  <Tag 
    size="md" 
    borderRadius="full" 
    variant="solid" 
    colorScheme={isPositive ? "green" : "red"}
    m={1}
  >
    {text}
  </Tag>
);

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerBg = useColorModeValue('blue.50', 'blue.900');
  const accentColor = "blue";

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

  // Get policy details from parent context if available
  const policyName = parentContext?.policyDetails?.name || "Insurance Policy";
  const policyType = parentContext?.policyDetails?.type || "Health Insurance";
  const policyProvider = parentContext?.policyDetails?.provider || "Insurance Provider";
  const policyNumber = parentContext?.policyDetails?.policyNumber || "";
  const policyIssuedDate = parentContext?.policyDetails?.issuedDate || "";
  const policyValidUntil = parentContext?.policyDetails?.validUntil || "";
  
  // Download PDF function
  const downloadPDF = async () => {
    if (!contentRef.current) return;
    
    try {
      setIsDownloading(true);
      
      const content = contentRef.current;
      const canvas = await html2canvas(content, {
        scale: 1.5, // Higher scale for better quality
        useCORS: true, // To handle images from other domains
        logging: false,
        windowWidth: 1920, // Fixed width helps with consistency
        windowHeight: content.scrollHeight,
        onclone: (doc) => {
          // Add styles for better PDF rendering
          const style = doc.createElement('style');
          style.innerHTML = `
            * { 
              -webkit-print-color-adjust: exact !important; 
              color-adjust: exact !important;
            }
          `;
          doc.head.appendChild(style);
          
          // Fix any elements that might break in PDF
          Array.from(doc.querySelectorAll('svg')).forEach(svg => {
            svg.setAttribute('width', svg.getBoundingClientRect().width.toString());
            svg.setAttribute('height', svg.getBoundingClientRect().height.toString());
          });
        }
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title
      pdf.setFontSize(20);
      pdf.text(`${policyName} Analysis Report`, 20, 20);
      
      // Add timestamp
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 28);
      
      // Add policy details
      pdf.setFontSize(12);
      pdf.text(`Policy Type: ${policyType}`, 20, 35);
      pdf.text(`Provider: ${policyProvider}`, 20, 42);
      if (policyNumber) pdf.text(`Policy Number: ${policyNumber}`, 20, 49);
      
      // Add main content
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.9), 
        'JPEG', 
        10, // x position
        55, // y position
        imgWidth - 20, // width
        imgHeight // height
      );
      
      // If content is too long, add pagination
      if (imgHeight > 250) { // A4 height - margins
        let pageCount = Math.ceil(imgHeight / 250);
        for (let i = 1; i < pageCount; i++) {
          pdf.addPage();
          pdf.addImage(
            canvas.toDataURL('image/jpeg', 0.9),
            'JPEG',
            10,
            -250 * i + 55,
            imgWidth - 20,
            imgHeight
          );
        }
      }
      
      // Save PDF with policy name
      pdf.save(`${policyName.replace(/\s+/g, '_')}_Analysis.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Function to translate the page
  const translatePage = (language: string) => {
    // Create a temporary hidden iframe to load the translation
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Get the content to translate
    const content = document.documentElement.outerHTML;
    
    // Create a form in the iframe to post to Google Translate
    const form = iframe.contentDocument?.createElement('form');
    if (form) {
      form.method = 'POST';
      form.action = `https://translate.google.com/translate`;
      form.target = '_blank';
      
      // Add the necessary parameters
      const params = {
        'hl': 'en',
        'sl': 'auto',
        'tl': language,
        'u': window.location.href,
        'sandbox': '1'
      };
      
      // Create hidden inputs for each parameter
      Object.entries(params).forEach(([key, value]) => {
        const input = iframe.contentDocument?.createElement('input');
        if (input) {
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }
      });
      
      // Add the form to the iframe and submit it
      iframe.contentDocument?.body.appendChild(form);
      form.submit();
    }
    
    // Clean up after a short delay
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  return (
    <Box bg={bgColor} minH="100vh">
      {/* Header */}
      <Box bg={headerBg} py={4} px={8} borderBottom="1px" borderColor={borderColor} boxShadow="sm">
        <Flex justify="space-between" align="center" maxW="container.xl" mx="auto">
          <VStack align="flex-start" spacing={1}>
            <Breadcrumb fontSize="sm">
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => navigate('/dashboard')}>Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>
                <BreadcrumbLink>Analysis Results</BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
            <Heading size="lg">{policyName}</Heading>
            <HStack spacing={4}>
              {/* <Text color="gray.600" fontSize="sm">
                {policyType}
              </Text> */}
              {/* <Text color="gray.600" fontSize="sm">
                •
              </Text>
              <Text color="gray.600" fontSize="sm">
                {policyProvider}
              </Text> */}
              {policyNumber && (
                <>
                  <Text color="gray.600" fontSize="sm">
                    •
                  </Text>
                  <Text color="gray.600" fontSize="sm">
                    Policy #{policyNumber}
                  </Text>
                </>
              )}
            </HStack>
          </VStack>
          <HStack spacing={3}>
            <Menu>
              <MenuButton
                as={Button}
                size="sm"
                leftIcon={<FaLanguage />}
                variant="outline"
                colorScheme={accentColor}
              >
                Translate
              </MenuButton>
              <MenuList>
                <MenuItem onClick={() => translatePage('hi')}>Hindi</MenuItem>
                <MenuItem onClick={() => translatePage('bn')}>Bengali</MenuItem>
                <MenuItem onClick={() => translatePage('ta')}>Tamil</MenuItem>
                <MenuItem onClick={() => translatePage('te')}>Telugu</MenuItem>
                <MenuItem onClick={() => translatePage('mr')}>Marathi</MenuItem>
                <MenuItem onClick={() => translatePage('gu')}>Gujarati</MenuItem>
                <MenuItem onClick={() => translatePage('kn')}>Kannada</MenuItem>
                <MenuItem onClick={() => translatePage('ml')}>Malayalam</MenuItem>
              </MenuList>
            </Menu>
            <Button 
              leftIcon={<DownloadIcon />} 
              colorScheme={accentColor} 
              variant="outline" 
              size="sm"
              onClick={downloadPDF}
              isLoading={isDownloading}
              loadingText="Downloading..."
            >
              Download Report
            </Button>
          <Tooltip label={isChatOpen ? "Close chat" : "Chat with your document"}>
            <IconButton
              aria-label="Toggle chat"
              icon={<ChatIcon />}
                colorScheme={accentColor}
              onClick={() => setIsChatOpen(!isChatOpen)}
            />
          </Tooltip>
          </HStack>
        </Flex>
      </Box>

      {/* Main Content */}
      <Flex maxW="container.xl" mx="auto" py={6} px={4}>
        {/* Main Analysis Content */}
        <Box 
          flex="3"
          pr={isChatOpen ? 6 : 0}
          overflowY="auto"
          ref={contentRef}
        >
          {/* Tabbed Interface */}
          <Tabs 
            colorScheme={accentColor} 
            variant="enclosed" 
            isLazy 
            index={activeTab} 
            onChange={setActiveTab}
          >
            <TabList overflowX="auto" whiteSpace="nowrap" py={2}>
              <Tab>Overview</Tab>
              <Tab>Coverage</Tab>
              <Tab>Exclusions</Tab>
              <Tab>Benefits</Tab>
              <Tab>Policy Design</Tab>
              <Tab>Obligations</Tab>
              <Tab>Premium Reduction</Tab>
            </TabList>

            <TabPanels>
              {/* Overview Tab */}
              <TabPanel px={0}>
                <VStack align="stretch" spacing={6}>
          {/* Policy Variants */}
                  <Section 
                    title="Policy Variants" 
                    icon={<InfoIcon mr={2} />}
                    description="Different variants of the policy and their unique features"
                  >
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
                            <Td fontWeight="bold">{display(v.variant_name)}</Td>
                    <Td>{display(v.variant_description)}</Td>
                    <Td>{display(v.target_demographic)}</Td>
                            <Td>
                              {Array.isArray(v.unique_features) && v.unique_features.map((feature: string, idx: number) => (
                                <BenefitTag key={idx} text={feature} />
                              ))}
                            </Td>
                  </Tr>
                )) : renderNoData(4)}
              </Tbody>
            </Table>
          </Section>

          {/* Benefits with Sublimits */}
                  <Section 
                    title="Benefits with Sublimits" 
                    icon={<InfoIcon mr={2} />}
                    description="Key benefits and their sublimits as extracted from your policy"
                  >
            <BenefitsBarChart data={benefits_with_sublimits} />
            <Table variant="simple" mt={6}>
              <Thead>
                <Tr>
                  <Th>Benefit Name</Th>
                  <Th>Sublimit Amount</Th>
                  <Th>Sublimit Type</Th>
                  <Th>Covered Items</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Array.isArray(benefits_with_sublimits) && benefits_with_sublimits.length > 0 ? benefits_with_sublimits.map((b: any, i: number) => (
                  <Tr key={i}>
                            <Td fontWeight="semibold">{display(b.benefit_name)}</Td>
                    <Td>{display(b.sublimit_details?.sublimit_amount)}</Td>
                    <Td>{display(b.sublimit_details?.sublimit_type)}</Td>
                    <Td>{display(b.coverage?.covered_items)}</Td>
                  </Tr>
                        )) : renderNoData(4)}
              </Tbody>
            </Table>
          </Section>

                  {/* Key Features */}
                  {parentContext?.keyFeatures && parentContext.keyFeatures.length > 0 && (
                    <Section 
                      title="Key Features" 
                      icon={<CheckCircleIcon mr={2} />}
                      description="Main features and highlights of your insurance policy"
                    >
                      <Grid templateColumns={{base: "1fr", md: "repeat(2, 1fr)"}} gap={4}>
                        {parentContext.keyFeatures.map((feature: string, idx: number) => (
                          <GridItem key={idx}>
                            <Card height="100%" bg={useColorModeValue('green.50', 'green.900')} borderLeft="4px" borderColor="green.400">
                              <CardBody>
                                <HStack align="flex-start">
                                  <Box color="green.500" mt={1} fontWeight="bold">•</Box>
                                  <Text>{feature}</Text>
                                </HStack>
                              </CardBody>
                            </Card>
                          </GridItem>
                        ))}
                      </Grid>
          </Section>
                  )}
                </VStack>
              </TabPanel>

              {/* Coverage Tab */}
              <TabPanel px={0}>
                <VStack align="stretch" spacing={6}>
          {/* Hospitalization Expense Coverage */}
                  <Section 
                    title="Hospitalization Expense Coverage" 
                    icon={<InfoIcon mr={2} />}
                    description="Details of coverage for hospitalization and related expenses"
                  >
                    <Grid templateColumns={{base: "1fr", md: "repeat(2, 1fr)"}} gap={6} mb={6}>
                      <GridItem>
                        <Card>
                          <CardBody>
                            <Stat>
                              <StatLabel>In-patient Care</StatLabel>
                              <StatNumber>{display(hospitalization_expense_coverage.in_patient_care?.coverage_amount)}</StatNumber>
                              <StatHelpText>Coverage Amount</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                      </GridItem>
                      <GridItem>
                        <Card>
                          <CardBody>
                            <Stat>
                              <StatLabel>Room Rent</StatLabel>
                              <StatNumber>{display(hospitalization_expense_coverage.room_rent_eligibility?.limit_value)}</StatNumber>
                              <StatHelpText>{display(hospitalization_expense_coverage.room_rent_eligibility?.limit_type)}</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                      </GridItem>
                    </Grid>
                    
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
                          <Td fontWeight="semibold">In-patient Care</Td>
                  <Td>{display(hospitalization_expense_coverage.in_patient_care?.coverage_amount)}</Td>
                  <Td>{display(hospitalization_expense_coverage.in_patient_care?.expenses_covered?.join(', '))}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Pre-hospitalization</Td>
                  <Td>{display(hospitalization_expense_coverage.pre_hospitalization_expenses?.coverage_amount)}</Td>
                  <Td>{display(hospitalization_expense_coverage.pre_hospitalization_expenses?.expenses_covered?.join(', '))}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Post-hospitalization</Td>
                  <Td>{display(hospitalization_expense_coverage.post_hospitalization_expenses?.coverage_amount)}</Td>
                  <Td>{display(hospitalization_expense_coverage.post_hospitalization_expenses?.expenses_covered?.join(', '))}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Room Rent</Td>
                  <Td>{display(hospitalization_expense_coverage.room_rent_eligibility?.limit_value)}</Td>
                  <Td>{display(hospitalization_expense_coverage.room_rent_eligibility?.limit_type)}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">ICU Rent</Td>
                  <Td>{display(hospitalization_expense_coverage.icu_rent_capping?.limit_value)}</Td>
                  <Td>{display(hospitalization_expense_coverage.icu_rent_capping?.limit_type)}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Ambulance (Road)</Td>
                  <Td>{display(hospitalization_expense_coverage.road_ambulance?.coverage_amount)}</Td>
                  <Td>{display(hospitalization_expense_coverage.road_ambulance?.coverage_basis)}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Ambulance (Air)</Td>
                  <Td>{display(hospitalization_expense_coverage.air_ambulance?.coverage_amount)}</Td>
                  <Td>{display(hospitalization_expense_coverage.air_ambulance?.coverage_basis)}</Td>
                </Tr>
              </Tbody>
            </Table>
          </Section>

                  {/* Treatment Coverage */}
                  <Section 
                    title="Treatment Coverage" 
                    icon={<InfoIcon mr={2} />}
                    description="Details of coverage for different types of medical treatments"
                  >
                    <Grid templateColumns={{base: "1fr", md: "repeat(3, 1fr)"}} gap={4} mb={6}>
                      {[
                        { label: "Day Care", value: treatment_coverage.day_care_treatments?.coverage_amount },
                        { label: "Organ Transplant", value: treatment_coverage.organ_transplant?.coverage_amount },
                        { label: "Modern Treatments", value: treatment_coverage.modern_treatments?.coverage_amount },
                        { label: "Alternative Treatments", value: treatment_coverage.alternative_treatments?.coverage_amount },
                        { label: "Artificial Life Maintenance", value: treatment_coverage.artificial_life_maintenance?.coverage_amount },
                        { label: "Mental Disorders", value: treatment_coverage.mental_disorders_treatment?.coverage_amount }
                      ].filter(item => item.value).map((item, idx) => (
                        <GridItem key={idx}>
                          <Card height="100%">
                            <CardBody>
                              <Stat>
                                <StatLabel>{item.label}</StatLabel>
                                <StatNumber>{display(item.value)}</StatNumber>
                                <StatHelpText>Coverage Amount</StatHelpText>
                              </Stat>
                            </CardBody>
                          </Card>
                        </GridItem>
                      ))}
                    </Grid>
                    
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
                          <Td fontWeight="semibold">Day Care</Td>
                          <Td>{display(treatment_coverage.day_care_treatments?.coverage_amount)}</Td>
                          <Td>{display(treatment_coverage.day_care_treatments?.covered_procedures?.join(', '))}</Td>
                        </Tr>
                        <Tr>
                          <Td fontWeight="semibold">Organ Transplant</Td>
                          <Td>{display(treatment_coverage.organ_transplant?.coverage_amount)}</Td>
                          <Td>{display(treatment_coverage.organ_transplant?.covered_organs?.join(', '))}</Td>
                        </Tr>
                        <Tr>
                          <Td fontWeight="semibold">Modern Treatments</Td>
                          <Td>{display(treatment_coverage.modern_treatments?.coverage_amount)}</Td>
                          <Td>{display(treatment_coverage.modern_treatments?.covered_procedures?.join(', '))}</Td>
                        </Tr>
                        <Tr>
                          <Td fontWeight="semibold">Alternative Treatments</Td>
                          <Td>{display(treatment_coverage.alternative_treatments?.coverage_amount)}</Td>
                          <Td>{display(treatment_coverage.alternative_treatments?.covered_systems?.join(', '))}</Td>
                        </Tr>
                        <Tr>
                          <Td fontWeight="semibold">Artificial Life Maintenance</Td>
                          <Td>{display(treatment_coverage.artificial_life_maintenance?.coverage_amount)}</Td>
                          <Td>{display(treatment_coverage.artificial_life_maintenance?.covered_situations?.join(', '))}</Td>
                        </Tr>
                        <Tr>
                          <Td fontWeight="semibold">Mental Disorders</Td>
                          <Td>{display(treatment_coverage.mental_disorders_treatment?.coverage_amount)}</Td>
                          <Td>{display(treatment_coverage.mental_disorders_treatment?.covered_conditions?.join(', '))}</Td>
                </Tr>
              </Tbody>
            </Table>
          </Section>

          {/* Maternity Features */}
                  <Section 
                    title="Maternity Features" 
                    icon={<InfoIcon mr={2} />}
                    description="Coverage details for maternity and newborn care"
                  >
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
                          <Td fontWeight="semibold">Maternity</Td>
                  <Td>{display(maternity_features.maternity_coverage?.coverage_amount)}</Td>
                  <Td>{display(maternity_features.maternity_coverage?.waiting_period)}</Td>
                  <Td>{display(maternity_features.maternity_coverage?.coverage_type)}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Newborn</Td>
                  <Td>{display(maternity_features.newborn_baby_cover?.coverage_amount)}</Td>
                  <Td>{display(maternity_features.newborn_baby_cover?.waiting_period)}</Td>
                  <Td>{display(maternity_features.newborn_baby_cover?.coverage_start)}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">IVF</Td>
                  <Td>{display(maternity_features.ivf_coverage?.coverage_amount)}</Td>
                  <Td>{display(maternity_features.ivf_coverage?.waiting_period)}</Td>
                  <Td>-</Td>
                </Tr>
              </Tbody>
            </Table>
          </Section>
                </VStack>
              </TabPanel>

              {/* Exclusions Tab */}
              <TabPanel px={0}>
                <VStack align="stretch" spacing={6}>
                  {/* Permanent Exclusions */}
                  <Section 
                    title="Permanent Exclusions" 
                    icon={<WarningIcon mr={2} />}
                    description="Conditions and treatments permanently excluded from coverage"
                  >
                    <Box mb={4}>
                      <Text fontWeight="bold" mb={2}>Standard Permanent Exclusions</Text>
                      <Card variant="outline">
                        <CardBody>
                          <List spacing={2}>
                            {Array.isArray(permanent_exclusions.standard_permanent_exclusions) && permanent_exclusions.standard_permanent_exclusions.length > 0 ? permanent_exclusions.standard_permanent_exclusions.map((e: any, i: number) => (
                              <ListItem key={i}>
                                <HStack align="flex-start">
                                  <ListIcon as={WarningIcon} color="red.500" mt={1} />
                                  <Text>{display(e.exclusion_description)}</Text>
                                </HStack>
                              </ListItem>
                            )) : <ListItem><i>No standard permanent exclusions found.</i></ListItem>}
                          </List>
                        </CardBody>
                      </Card>
                    </Box>
                    
                    <Box>
                      <Text fontWeight="bold" mb={2}>Non-Standard Permanent Exclusions</Text>
                      <Card variant="outline">
                        <CardBody>
                          <List spacing={2}>
                            {Array.isArray(permanent_exclusions.non_standard_permanent_exclusions) && permanent_exclusions.non_standard_permanent_exclusions.length > 0 ? permanent_exclusions.non_standard_permanent_exclusions.map((e: any, i: number) => (
                              <ListItem key={i}>
                                <HStack align="flex-start">
                                  <ListIcon as={WarningIcon} color="orange.500" mt={1} />
                                  <Text>{display(e.exclusion_description)}</Text>
                                </HStack>
                              </ListItem>
                            )) : <ListItem><i>No non-standard permanent exclusions found.</i></ListItem>}
                          </List>
                        </CardBody>
                      </Card>
                    </Box>
                  </Section>

                  {/* Exclusions with Waiting Periods */}
                  <Section 
                    title="Exclusions with Waiting Periods" 
                    icon={<InfoIcon mr={2} />}
                    description="Conditions and treatments excluded for specific time periods"
                  >
                    <Grid templateColumns={{base: "1fr", md: "repeat(3, 1fr)"}} gap={4} mb={6}>
                      <GridItem>
                        <Card height="100%">
                          <CardBody>
                            <Stat>
                              <StatLabel>Initial Waiting Period</StatLabel>
                              <StatNumber>{display(exclusions_with_waiting_periods.initial_waiting_period?.duration)}</StatNumber>
                              <StatHelpText>For all diseases and conditions</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                      </GridItem>
                      <GridItem>
                        <Card height="100%">
                          <CardBody>
                            <Stat>
                              <StatLabel>Pre-existing Diseases</StatLabel>
                              <StatNumber>{display(exclusions_with_waiting_periods.pre_existing_diseases_waiting_period?.duration)}</StatNumber>
                              <StatHelpText>Waiting period for coverage</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                      </GridItem>
                      <GridItem>
                        <Card height="100%">
                          <CardBody>
                            <Stat>
                              <StatLabel>Specified Diseases</StatLabel>
                              <StatNumber>{display(exclusions_with_waiting_periods.specified_diseases_procedures_waiting_period?.duration)}</StatNumber>
                              <StatHelpText>For listed conditions</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                      </GridItem>
                    </Grid>
                    
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
                          <Td fontWeight="semibold">Initial Waiting Period</Td>
                          <Td>{display(exclusions_with_waiting_periods.initial_waiting_period?.duration)}</Td>
                          <Td>{display(exclusions_with_waiting_periods.initial_waiting_period?.excluded_expenses?.join(', '))}</Td>
                        </Tr>
                        <Tr>
                          <Td fontWeight="semibold">Pre-existing Diseases</Td>
                          <Td>{display(exclusions_with_waiting_periods.pre_existing_diseases_waiting_period?.duration)}</Td>
                          <Td>{display(exclusions_with_waiting_periods.pre_existing_diseases_waiting_period?.definition)}</Td>
                        </Tr>
                        <Tr>
                          <Td fontWeight="semibold">Specified Diseases</Td>
                          <Td>{display(exclusions_with_waiting_periods.specified_diseases_procedures_waiting_period?.duration)}</Td>
                          <Td>{display(exclusions_with_waiting_periods.specified_diseases_procedures_waiting_period?.included_diseases_procedures?.join(', '))}</Td>
                        </Tr>
                        <Tr>
                          <Td fontWeight="semibold">Maternity</Td>
                          <Td>{display(exclusions_with_waiting_periods.maternity_waiting_period?.duration)}</Td>
                          <Td>{display(exclusions_with_waiting_periods.maternity_waiting_period?.covered_expenses?.join(', '))}</Td>
                        </Tr>
                      </Tbody>
                    </Table>
                  </Section>
                </VStack>
              </TabPanel>

              {/* Benefits Tab */}
              <TabPanel px={0}>
                <VStack align="stretch" spacing={6}>
          {/* Non-Treatment Benefits */}
                  <Section 
                    title="Non-Treatment Benefits" 
                    icon={<InfoIcon mr={2} />}
                    description="Additional benefits beyond medical treatment coverage"
                  >
                    <Grid templateColumns={{base: "1fr", md: "repeat(3, 1fr)"}} gap={4} mb={6}>
                      <GridItem>
                        <Card height="100%">
                          <CardBody>
                            <Stat>
                              <StatLabel>Daily Hospitalization Cash</StatLabel>
                              <StatNumber>{display(non_treatment_benefits.daily_hospitalization_cash?.benefit_amount)}</StatNumber>
                              <StatHelpText>Per day benefit</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                      </GridItem>
                      <GridItem>
                        <Card height="100%">
                          <CardBody>
                            <Stat>
                              <StatLabel>OPD Treatment</StatLabel>
                              <StatNumber>{display(non_treatment_benefits.opd_treatment?.coverage_amount)}</StatNumber>
                              <StatHelpText>Outpatient coverage</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                      </GridItem>
                      <GridItem>
                        <Card height="100%">
                          <CardBody>
                            <Stat>
                              <StatLabel>Shared Accommodation</StatLabel>
                              <StatNumber>{display(non_treatment_benefits.shared_accommodation_benefit?.benefit_amount)}</StatNumber>
                              <StatHelpText>Shared room benefit</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                      </GridItem>
                    </Grid>
                    
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
                          <Td fontWeight="semibold">Daily Hospitalization Cash</Td>
                  <Td>{display(non_treatment_benefits.daily_hospitalization_cash?.benefit_amount)}</Td>
                  <Td>{display(non_treatment_benefits.daily_hospitalization_cash?.waiting_period)}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Shared Accommodation</Td>
                  <Td>{display(non_treatment_benefits.shared_accommodation_benefit?.benefit_amount)}</Td>
                  <Td>{display(non_treatment_benefits.shared_accommodation_benefit?.trigger_conditions?.join(', '))}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">OPD Treatment</Td>
                  <Td>{display(non_treatment_benefits.opd_treatment?.coverage_amount)}</Td>
                  <Td>{display(non_treatment_benefits.opd_treatment?.covered_services?.join(', '))}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Annual Health Checkup</Td>
                  <Td>-</Td>
                  <Td>{display(non_treatment_benefits.annual_health_checkup?.coverage_details)}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Doctor Consultation</Td>
                  <Td>-</Td>
                  <Td>{display(non_treatment_benefits.doctor_consultation?.consultation_types?.join(', '))}</Td>
                </Tr>
              </Tbody>
            </Table>
          </Section>

          {/* Optional Addon Benefits */}
                  <Section 
                    title="Optional Addon Benefits" 
                    icon={<InfoIcon mr={2} />}
                    description="Optional riders and add-ons that can enhance your policy"
                  >
                    <Box mb={6}>
                      {Array.isArray(optional_addon_benefits) && optional_addon_benefits.length > 0 ? (
                        <Grid templateColumns={{base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)"}} gap={4}>
                          {optional_addon_benefits.map((benefit, idx) => (
                            <GridItem key={idx}>
                              <Card height="100%" variant="outline" borderWidth="1px" borderColor="blue.100">
                                <CardBody>
                                  <VStack align="start" spacing={2}>
                                    <Badge colorScheme="blue">{benefit.benefit_type}</Badge>
                                    <Heading size="sm">{benefit.benefit_name}</Heading>
                                    <Text fontSize="sm">{benefit.benefit_summary}</Text>
                                    <HStack>
                                      <Text fontSize="xs" fontWeight="bold">Coverage:</Text>
                                      <Text fontSize="xs">{display(benefit.coverage_details?.coverage_amount)}</Text>
                                    </HStack>
                                    {benefit.waiting_period?.duration && (
                                      <HStack>
                                        <Text fontSize="xs" fontWeight="bold">Waiting Period:</Text>
                                        <Text fontSize="xs">{display(benefit.waiting_period?.duration)}</Text>
                                      </HStack>
                                    )}
                                  </VStack>
                                </CardBody>
                              </Card>
                            </GridItem>
                          ))}
                        </Grid>
                      ) : (
                        <Text>No optional addon benefits found.</Text>
                      )}
                    </Box>
                    
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
                            <Td fontWeight="semibold">{display(b.benefit_name)}</Td>
                    <Td>{display(b.benefit_type)}</Td>
                    <Td>{display(b.benefit_summary)}</Td>
                    <Td>{display(b.coverage_details?.coverage_amount)}</Td>
                    <Td>{display(b.waiting_period?.duration)}</Td>
                  </Tr>
                )) : renderNoData(5)}
              </Tbody>
            </Table>
          </Section>

                  {/* Sum Insured Enhancement */}
                  <Section 
                    title="Sum Insured Enhancement" 
                    icon={<InfoIcon mr={2} />}
                    description="Ways your sum insured can be enhanced or restored"
                  >
                    <Grid templateColumns={{base: "1fr", md: "repeat(3, 1fr)"}} gap={4} mb={6}>
                      <GridItem>
                        <Card height="100%">
                          <CardBody>
                            <Stat>
                              <StatLabel>Restore/Reset</StatLabel>
                              <StatNumber>{display(si_enhancement.restore_reset_sum_insured?.restoration_amount)}</StatNumber>
                              <StatHelpText>{display(si_enhancement.restore_reset_sum_insured?.restoration_mechanism)}</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                      </GridItem>
                      <GridItem>
                        <Card height="100%">
                          <CardBody>
                            <Stat>
                              <StatLabel>No Claim Bonus</StatLabel>
                              <StatNumber>{display(si_enhancement.no_claim_bonus?.bonus_amount)}</StatNumber>
                              <StatHelpText>{display(si_enhancement.no_claim_bonus?.bonus_type)}</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                      </GridItem>
                      <GridItem>
                        <Card height="100%">
                          <CardBody>
                            <Stat>
                              <StatLabel>Utilization Sequence</StatLabel>
                              <StatNumber>Sequential</StatNumber>
                              <StatHelpText>{display(si_enhancement.utilization_sequence?.sequence_order?.join(' → '))}</StatHelpText>
                            </Stat>
                          </CardBody>
                        </Card>
                      </GridItem>
                    </Grid>
                    
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Feature</Th>
                          <Th>Details</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        <Tr>
                          <Td fontWeight="semibold">Restore/Reset</Td>
                          <Td>{display(si_enhancement.restore_reset_sum_insured?.restoration_mechanism)} ({display(si_enhancement.restore_reset_sum_insured?.restoration_amount)})</Td>
                        </Tr>
                        <Tr>
                          <Td fontWeight="semibold">No Claim Bonus</Td>
                          <Td>{display(si_enhancement.no_claim_bonus?.bonus_type)} ({display(si_enhancement.no_claim_bonus?.bonus_amount)})</Td>
                        </Tr>
                        <Tr>
                          <Td fontWeight="semibold">Utilization Sequence</Td>
                          <Td>{display(si_enhancement.utilization_sequence?.sequence_order?.join(' → '))}</Td>
                        </Tr>
                        <Tr>
                          <Td fontWeight="semibold">Additional Features</Td>
                          <Td>{display(si_enhancement.additional_enhancement_features?.map((f: any) => f.feature_name))}</Td>
                        </Tr>
                      </Tbody>
                    </Table>
                  </Section>
                </VStack>
              </TabPanel>

              {/* Policy Design Tab */}
              <TabPanel px={0}>
                <VStack align="stretch" spacing={6}>
                  {/* Policy Design */}
                  <Section 
                    title="Policy Structure" 
                    icon={<InfoIcon mr={2} />}
                    description="Core design elements of your insurance policy"
                  >
                    <Grid templateColumns={{base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)"}} gap={6} mb={6}>
                      <GridItem>
                        <Card height="100%" bg={useColorModeValue('blue.50', 'blue.900')}>
                          <CardBody>
                            <Heading size="sm" mb={3}>Sum Insured Options</Heading>
                            <Box>
                              {Array.isArray(policy_design.base_sum_insured?.options) ? 
                                policy_design.base_sum_insured?.options.map((option: string, idx: number) => (
                                  <Tag key={idx} m={1} colorScheme="blue">{option}</Tag>
                                )) : 
                                <Text>No options specified</Text>
                              }
                            </Box>
                          </CardBody>
                        </Card>
                      </GridItem>
                      <GridItem>
                        <Card height="100%" bg={useColorModeValue('green.50', 'green.900')}>
                          <CardBody>
                            <Heading size="sm" mb={3}>Coverage Types</Heading>
                            <Box>
                              {Array.isArray(policy_design.coverage_type?.types) ? 
                                policy_design.coverage_type?.types.map((type: string, idx: number) => (
                                  <Tag key={idx} m={1} colorScheme="green">{type}</Tag>
                                )) : 
                                <Text>No types specified</Text>
                              }
                            </Box>
                          </CardBody>
                        </Card>
                      </GridItem>
                      <GridItem>
                        <Card height="100%" bg={useColorModeValue('purple.50', 'purple.900')}>
                          <CardBody>
                            <Heading size="sm" mb={3}>Policy Tenure Options</Heading>
                            <Box>
                              {Array.isArray(policy_design.policy_tenure?.options) ? 
                                policy_design.policy_tenure?.options.map((option: string, idx: number) => (
                                  <Tag key={idx} m={1} colorScheme="purple">{option}</Tag>
                                )) : 
                                <Text>No options specified</Text>
                              }
                            </Box>
                          </CardBody>
                        </Card>
                      </GridItem>
                    </Grid>
                    
                    <Grid templateColumns={{base: "1fr", md: "repeat(2, 1fr)"}} gap={6}>
                      <GridItem>
                        <Card mb={4}>
                          <CardBody>
                            <Heading size="sm" mb={3}>Age Eligibility</Heading>
                            <HStack spacing={6}>
                              <Box>
                                <Text fontWeight="bold">Adult</Text>
                                <Text>Min: {display(policy_design.age_eligibility?.adult?.minimum_age)}</Text>
                                <Text>Max: {display(policy_design.age_eligibility?.adult?.maximum_age)}</Text>
                              </Box>
                              <Box>
                                <Text fontWeight="bold">Child</Text>
                                <Text>Min: {display(policy_design.age_eligibility?.child?.minimum_age)}</Text>
                                <Text>Max: {display(policy_design.age_eligibility?.child?.maximum_age)}</Text>
                              </Box>
                            </HStack>
                          </CardBody>
                        </Card>
                      </GridItem>
                      
                      <GridItem>
                        <Card mb={4}>
                          <CardBody>
                            <Heading size="sm" mb={3}>Members Allowed</Heading>
                            <HStack spacing={6}>
                              <Box>
                                <Text fontWeight="bold">Individual</Text>
                                <Text>Adults: {display(policy_design.members_allowed?.individual_policy?.max_adults)}</Text>
                                <Text>Children: {display(policy_design.members_allowed?.individual_policy?.max_children)}</Text>
                              </Box>
                              <Box>
                                <Text fontWeight="bold">Family Floater</Text>
                                <Text>Adults: {display(policy_design.members_allowed?.family_floater?.max_adults)}</Text>
                                <Text>Children: {display(policy_design.members_allowed?.family_floater?.max_children)}</Text>
                              </Box>
                            </HStack>
                          </CardBody>
                        </Card>
                      </GridItem>
                    
                      <GridItem>
                        <Card mb={4}>
                          <CardBody>
                            <Heading size="sm" mb={3}>Relationships Allowed</Heading>
                            <VStack align="start">
                              <Box>
                                <Text fontWeight="bold">Individual Policy:</Text>
                                <Box mt={1}>
                                  {Array.isArray(policy_design.relationships_allowed?.individual_policy) ? 
                                    policy_design.relationships_allowed?.individual_policy.map((relation: string, idx: number) => (
                                      <Tag key={idx} m={1} colorScheme="blue">{relation}</Tag>
                                    )) : 
                                    <Text>No relationships specified</Text>
                                  }
                                </Box>
                              </Box>
                              <Box>
                                <Text fontWeight="bold">Family Floater:</Text>
                                <Box mt={1}>
                                  {Array.isArray(policy_design.relationships_allowed?.family_floater) ? 
                                    policy_design.relationships_allowed?.family_floater.map((relation: string, idx: number) => (
                                      <Tag key={idx} m={1} colorScheme="green">{relation}</Tag>
                                    )) : 
                                    <Text>No relationships specified</Text>
                                  }
                                </Box>
                              </Box>
                            </VStack>
                          </CardBody>
                        </Card>
                      </GridItem>
                      
                      <GridItem>
                        <Card mb={4}>
                          <CardBody>
                            <Heading size="sm" mb={3}>Zonal Pricing</Heading>
                            <VStack align="start">
                              <Box>
                                <Text fontWeight="bold">Zones:</Text>
                                <Box mt={1}>
                                  {Array.isArray(policy_design.zonal_pricing?.zones) ? 
                                    policy_design.zonal_pricing?.zones.map((zone: string, idx: number) => (
                                      <Tag key={idx} m={1} colorScheme="purple">{zone}</Tag>
                                    )) : 
                                    <Text>No zones specified</Text>
                                  }
                                </Box>
                              </Box>
                              <Box>
                                <Text fontWeight="bold">Premium Impact:</Text>
                                <Text>{display(policy_design.zonal_pricing?.premium_impact?.join(', '))}</Text>
                              </Box>
                            </VStack>
                          </CardBody>
                        </Card>
                      </GridItem>
                    </Grid>
                    
                    <Accordion allowToggle mt={4}>
              <AccordionItem>
                <AccordionButton>
                          <Box flex="1" textAlign="left">
                            <Heading size="sm">Detailed Policy Design Information</Heading>
                          </Box>
                  <AccordionIcon />
                </AccordionButton>
                        <AccordionPanel pb={4}>
                          <Table variant="simple">
                            <Tbody>
                              <Tr>
                                <Td fontWeight="bold">Sum Insured Options</Td>
                                <Td>{display(policy_design.base_sum_insured?.options?.join(', '))}</Td>
                              </Tr>
                              <Tr>
                                <Td fontWeight="bold">Coverage Types</Td>
                                <Td>{display(policy_design.coverage_type?.types?.join(', '))}</Td>
                              </Tr>
                              <Tr>
                                <Td fontWeight="bold">Age Eligibility (Adult)</Td>
                                <Td>{display(policy_design.age_eligibility?.adult?.minimum_age)} - {display(policy_design.age_eligibility?.adult?.maximum_age)}</Td>
                              </Tr>
                              <Tr>
                                <Td fontWeight="bold">Age Eligibility (Child)</Td>
                                <Td>{display(policy_design.age_eligibility?.child?.minimum_age)} - {display(policy_design.age_eligibility?.child?.maximum_age)}</Td>
                              </Tr>
                              <Tr>
                                <Td fontWeight="bold">Members (Individual)</Td>
                                <Td>{display(policy_design.members_allowed?.individual_policy?.max_adults)} adults, {display(policy_design.members_allowed?.individual_policy?.max_children)} children</Td>
                              </Tr>
                              <Tr>
                                <Td fontWeight="bold">Members (Family Floater)</Td>
                                <Td>{display(policy_design.members_allowed?.family_floater?.max_adults)} adults, {display(policy_design.members_allowed?.family_floater?.max_children)} children</Td>
                              </Tr>
                              <Tr>
                                <Td fontWeight="bold">Relationships (Individual)</Td>
                                <Td>{display(policy_design.relationships_allowed?.individual_policy?.join(', '))}</Td>
                              </Tr>
                              <Tr>
                                <Td fontWeight="bold">Relationships (Family Floater)</Td>
                                <Td>{display(policy_design.relationships_allowed?.family_floater?.join(', '))}</Td>
                              </Tr>
                              <Tr>
                                <Td fontWeight="bold">Maximum Renewal Age (Adults)</Td>
                                <Td>{display(policy_design.maximum_renewal_age?.family_floater?.adults)}</Td>
                              </Tr>
                              <Tr>
                                <Td fontWeight="bold">Maximum Renewal Age (Children)</Td>
                                <Td>{display(policy_design.maximum_renewal_age?.family_floater?.children)}</Td>
                              </Tr>
                              <Tr>
                                <Td fontWeight="bold">Zonal Pricing</Td>
                                <Td>{display(policy_design.zonal_pricing?.zones?.join(', '))}</Td>
                              </Tr>
                              <Tr>
                                <Td fontWeight="bold">Premium Impact</Td>
                                <Td>{display(policy_design.zonal_pricing?.premium_impact?.join(', '))}</Td>
                              </Tr>
                              <Tr>
                                <Td fontWeight="bold">Policy Tenure Options</Td>
                                <Td>{display(policy_design.policy_tenure?.options?.join(', '))}</Td>
                              </Tr>
                              <Tr>
                                <Td fontWeight="bold">Premium Payment Cycle</Td>
                                <Td>{display(policy_design.premium_payment_cycle?.options?.join(', '))}</Td>
                              </Tr>
                            </Tbody>
                          </Table>
                </AccordionPanel>
              </AccordionItem>
                    </Accordion>
                  </Section>
                </VStack>
              </TabPanel>

              {/* Obligations Tab */}
              <TabPanel px={0}>
                <VStack align="stretch" spacing={6}>
                  {/* Policyholder Obligations */}
                  <Section 
                    title="Policyholder Obligations" 
                    icon={<InfoIcon mr={2} />}
                    description="Requirements and responsibilities of the policyholder"
                  >
                    {Array.isArray(policyholder_obligations) && policyholder_obligations.length > 0 ? (
                      <Accordion allowMultiple mb={6}>
                        {policyholder_obligations.map((obligation, idx) => (
                          <AccordionItem key={idx}>
                            <AccordionButton py={3}>
                              <Box flex="1" textAlign="left">
                                <HStack>
                                  <Badge colorScheme={
                                    obligation.policy_lifecycle_stage === "Pre-Policy" ? "purple" :
                                    obligation.policy_lifecycle_stage === "During Policy" ? "blue" :
                                    obligation.policy_lifecycle_stage === "Claims" ? "orange" : "gray"
                                  }>
                                    {obligation.policy_lifecycle_stage}
                                  </Badge>
                                  <Text fontWeight="bold">{obligation.obligation_name}</Text>
                                </HStack>
                              </Box>
                  <AccordionIcon />
                </AccordionButton>
                            <AccordionPanel pb={4}>
                              <Box>
                                <Text fontWeight="bold" mb={1}>Category:</Text>
                                <Text mb={3}>{display(obligation.obligation_category)}</Text>
                                
                                <Text fontWeight="bold" mb={1}>Summary:</Text>
                                <Text mb={3}>{display(obligation.obligation_summary)}</Text>
                                
                                <Text fontWeight="bold" mb={1}>Purpose:</Text>
                                <Text>{display(obligation.purpose)}</Text>
                              </Box>
                </AccordionPanel>
              </AccordionItem>
                        ))}
            </Accordion>
                    ) : (
                      <Text>No policyholder obligations found.</Text>
                    )}
                    
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
                            <Td fontWeight="semibold">{display(o.obligation_name)}</Td>
                    <Td>{display(o.obligation_category)}</Td>
                            <Td>
                              <Badge colorScheme={
                                o.policy_lifecycle_stage === "Pre-Policy" ? "purple" :
                                o.policy_lifecycle_stage === "During Policy" ? "blue" :
                                o.policy_lifecycle_stage === "Claims" ? "orange" : "gray"
                              }>
                                {display(o.policy_lifecycle_stage)}
                              </Badge>
                            </Td>
                    <Td>{display(o.obligation_summary)}</Td>
                    <Td>{display(o.purpose)}</Td>
                  </Tr>
                )) : renderNoData(5)}
              </Tbody>
            </Table>
          </Section>

                  {/* Pre-Policy Medical Checkup */}
                  <Section 
                    title="Pre-Policy Medical Checkup" 
                    icon={<InfoIcon mr={2} />}
                    description="Requirements for medical examination before policy issuance"
                  >
                    <Card mb={4}>
                      <CardBody>
                        <VStack align="start" spacing={4}>
                          <Box>
                            <Heading size="sm" mb={2}>Required For</Heading>
                            <Box>
                              {Array.isArray(policy_design.pre_policy_medical_checkup?.required_for) ? 
                                policy_design.pre_policy_medical_checkup?.required_for.map((item: string, idx: number) => (
                                  <Tag key={idx} m={1} colorScheme="blue">{item}</Tag>
                                )) : 
                                <Text>No specific requirements mentioned</Text>
                              }
                            </Box>
                          </Box>
                          
                          <Box>
                            <Heading size="sm" mb={2}>Triggering Conditions</Heading>
                            <Box>
                              {Array.isArray(policy_design.pre_policy_medical_checkup?.triggering_conditions) ? 
                                policy_design.pre_policy_medical_checkup?.triggering_conditions.map((item: string, idx: number) => (
                                  <Tag key={idx} m={1} colorScheme="orange">{item}</Tag>
                                )) : 
                                <Text>No specific triggering conditions mentioned</Text>
                              }
                            </Box>
                          </Box>
                          
                          <Box>
                            <Heading size="sm" mb={2}>Exemptions</Heading>
                            <Box>
                              {Array.isArray(policy_design.pre_policy_medical_checkup?.exemptions) ? 
                                policy_design.pre_policy_medical_checkup?.exemptions.map((item: string, idx: number) => (
                                  <Tag key={idx} m={1} colorScheme="green">{item}</Tag>
                                )) : 
                                <Text>No specific exemptions mentioned</Text>
                              }
                            </Box>
                          </Box>
                        </VStack>
                      </CardBody>
                    </Card>
                  </Section>
                </VStack>
              </TabPanel>

              {/* Premium Reduction Tab */}
              <TabPanel px={0}>
                <VStack align="stretch" spacing={6}>
                  {/* Premium Reduction Options */}
                  <Section 
                    title="Premium Reduction Options" 
                    icon={<InfoIcon mr={2} />}
                    description="Ways to reduce your premium costs"
                  >
                    <Grid templateColumns={{base: "1fr", md: "repeat(3, 1fr)"}} gap={4} mb={6}>
                      {[
                        { 
                          title: "Tenure Discount", 
                          value: Object.values(premium_reduction.tenure_discount?.discount_percentages || {}).join(', '),
                          details: premium_reduction.tenure_discount?.application_method,
                          color: "blue"
                        },
                        { 
                          title: "Network Hospital Restriction", 
                          value: premium_reduction.network_hospital_restriction?.discount_percentage,
                          details: premium_reduction.network_hospital_restriction?.non_network_impact,
                          color: "green"
                        },
                        { 
                          title: "Room Rent Modification", 
                          value: Object.values(premium_reduction.room_rent_modification?.discount_percentages || {}).join(', '),
                          details: premium_reduction.room_rent_modification?.available_categories?.join(', '),
                          color: "purple"
                        },
                        { 
                          title: "Optional Copayment", 
                          value: Object.values(premium_reduction.optional_copayment?.corresponding_discounts || {}).join(', '),
                          details: premium_reduction.optional_copayment?.available_percentages?.join(', '),
                          color: "orange"
                        },
                        { 
                          title: "Annual Aggregate Deductible", 
                          value: Object.values(premium_reduction.annual_aggregate_deductible?.corresponding_discounts || {}).join(', '),
                          details: premium_reduction.annual_aggregate_deductible?.available_amounts?.join(', '),
                          color: "pink"
                        },
                        { 
                          title: "Healthy Life Discount", 
                          value: Object.values(premium_reduction.healthy_life_discount?.discount_percentages || {}).join(', '),
                          details: premium_reduction.healthy_life_discount?.monitored_parameters?.join(', '),
                          color: "teal"
                        }
                      ].filter(item => item.value).map((item, idx) => (
                        <GridItem key={idx}>
                          <Card height="100%" borderLeft="4px" borderColor={`${item.color}.500`}>
                            <CardBody>
                              <VStack align="start" spacing={2}>
                                <Heading size="sm">{item.title}</Heading>
                                <HStack>
                                  <Text fontWeight="bold">Discount:</Text>
                                  <Text>{display(item.value)}</Text>
                                </HStack>
                                <HStack>
                                  <Text fontWeight="bold">Details:</Text>
                                  <Text fontSize="sm" noOfLines={2}>{display(item.details)}</Text>
                                </HStack>
                              </VStack>
                            </CardBody>
                          </Card>
                        </GridItem>
                      ))}
                    </Grid>
                    
                    {/* Premium Lock */}
                    {premium_reduction.premium_lock?.locking_mechanism && (
                      <Card mb={6} bg={useColorModeValue('yellow.50', 'yellow.900')} borderRadius="md">
                        <CardBody>
                          <Flex direction={{base: "column", md: "row"}} justify="space-between" align="center">
                            <Box>
                              <Heading size="md">Premium Lock</Heading>
                              <Text>{display(premium_reduction.premium_lock?.locking_mechanism)}</Text>
                            </Box>
                            <Badge colorScheme="yellow" p={2} fontSize="lg" borderRadius="md" mt={{base: 4, md: 0}}>
                              {display(premium_reduction.premium_lock?.lock_duration)} years
                            </Badge>
                          </Flex>
                        </CardBody>
                      </Card>
                    )}
                    
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
                          <Td fontWeight="semibold">Tenure Discount</Td>
                  <Td>{display(Object.values(premium_reduction.tenure_discount?.discount_percentages || {}).join(', '))}</Td>
                  <Td>{display(premium_reduction.tenure_discount?.application_method)}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Network Hospital Restriction</Td>
                  <Td>{display(premium_reduction.network_hospital_restriction?.discount_percentage)}</Td>
                  <Td>{display(premium_reduction.network_hospital_restriction?.non_network_impact)}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Room Rent Modification</Td>
                  <Td>{display(Object.values(premium_reduction.room_rent_modification?.discount_percentages || {}).join(', '))}</Td>
                  <Td>{display(premium_reduction.room_rent_modification?.available_categories?.join(', '))}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Optional Copayment</Td>
                  <Td>{display(Object.values(premium_reduction.optional_copayment?.corresponding_discounts || {}).join(', '))}</Td>
                  <Td>{display(premium_reduction.optional_copayment?.available_percentages?.join(', '))}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Annual Aggregate Deductible</Td>
                  <Td>{display(Object.values(premium_reduction.annual_aggregate_deductible?.corresponding_discounts || {}).join(', '))}</Td>
                  <Td>{display(premium_reduction.annual_aggregate_deductible?.available_amounts?.join(', '))}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Healthy Life Discount</Td>
                  <Td>{display(Object.values(premium_reduction.healthy_life_discount?.discount_percentages || {}).join(', '))}</Td>
                  <Td>{display(premium_reduction.healthy_life_discount?.monitored_parameters?.join(', '))}</Td>
                </Tr>
                <Tr>
                          <Td fontWeight="semibold">Premium Lock</Td>
                  <Td>{display(premium_reduction.premium_lock?.locking_mechanism)}</Td>
                  <Td>{display(premium_reduction.premium_lock?.lock_duration)} years</Td>
                </Tr>
              </Tbody>
            </Table>
          </Section>
        </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
           
          {/* Customer Service Information */}
          {parentContext?.customerService && (
            <Box mt={6} mb={8}>
              <Card variant="outline" borderRadius="md">
                <CardBody>
                  <Flex direction={{base: "column", md: "row"}} justify="space-between" align="center">
                    <HStack>
                      <Heading size="sm">Customer Service</Heading>
                    </HStack>
                    <HStack spacing={6} mt={{base: 4, md: 0}}>
                      {parentContext.customerService.contactPhone && (
                        <Box textAlign="center">
                          <Text fontSize="sm" color="gray.500">Phone</Text>
                          <Text fontWeight="bold">{parentContext.customerService.contactPhone}</Text>
                        </Box>
                      )}
                      {parentContext.customerService.contactEmail && (
                        <Box textAlign="center">
                          <Text fontSize="sm" color="gray.500">Email</Text>
                          <Text fontWeight="bold">{parentContext.customerService.contactEmail}</Text>
                        </Box>
                      )}
                      {parentContext.customerService.website && (
                        <Box textAlign="center">
                          <Text fontSize="sm" color="gray.500">Website</Text>
                          <Link href={parentContext.customerService.website} isExternal fontWeight="bold">
                            {parentContext.customerService.website.replace(/^https?:\/\//, '')}
                          </Link>
                        </Box>
                      )}
                    </HStack>
                  </Flex>
                </CardBody>
              </Card>
            </Box>
          )}
      </Box>

        {/* Chat Interface */}
      {isChatOpen && (
          <Box 
            flex="1" 
            ml={4} 
            borderLeft="1px" 
            borderColor={borderColor} 
            pl={4}
            h="calc(100vh - 120px)"
            bg={cardBg}
            borderRadius="lg"
            boxShadow="sm"
            overflow="hidden"
          >
            <Box 
              p={4} 
              borderBottom="1px" 
              borderColor="inherit" 
              bg={headerBg}
            >
              <Heading size="md">Chat with your document</Heading>
              <Text fontSize="sm" mt={1} color={useColorModeValue('gray.600', 'gray.400')}>
                Ask questions about your insurance policy
              </Text>
            </Box>
            <Box p={0} h="calc(100% - 80px)">
          <ChatInterface
            documentContext={completeContext}
            isOpen={true}
          />
            </Box>
        </Box>
      )}
    </Flex>
    </Box>
  );
};

export default Results; 