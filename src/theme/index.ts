import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: '#0A1929',
        color: 'gray.100',
      },
    },
  },
  colors: {
    brand: {
      50: '#E3F2FD',
      100: '#BBDEFB',
      200: '#90CAF9',
      300: '#64B5F6',
      400: '#42A5F5',
      500: '#2196F3',
      600: '#1E88E5',
      700: '#1976D2',
      800: '#1565C0',
      900: '#0D47A1',
    },
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'semibold',
        borderRadius: 'lg',
      },
      variants: {
        solid: (props: { colorScheme: string }) => ({
          bg: `${props.colorScheme}.500`,
          color: 'white',
          _hover: {
            bg: `${props.colorScheme}.600`,
            _disabled: {
              bg: `${props.colorScheme}.500`,
            },
          },
          _active: { bg: `${props.colorScheme}.700` },
        }),
        ghost: {
          color: 'gray.400',
          _hover: {
            bg: 'whiteAlpha.100',
          },
          _active: {
            bg: 'whiteAlpha.200',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: 'xl',
          bg: 'gray.800',
          borderColor: 'gray.700',
        },
      },
    },
    Menu: {
      baseStyle: {
        list: {
          bg: 'gray.800',
          borderColor: 'gray.700',
          boxShadow: 'lg',
        },
        item: {
          bg: 'gray.800',
          _hover: {
            bg: 'gray.700',
          },
          _focus: {
            bg: 'gray.700',
          },
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'gray.800',
            borderColor: 'gray.600',
            _hover: {
              borderColor: 'gray.500',
            },
            _focus: {
              borderColor: 'brand.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
            },
          },
        },
      },
    },
  },
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
});

export default theme; 