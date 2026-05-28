export const CHANNELS = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  PAID_DIGITAL: 'paid_digital',
} as const

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS]

export interface SectionConfig {
  key: string
  label: string
  charLimit: number | null
  required: boolean
  multiline: boolean
  placeholder: string
}

export interface ChannelConfig {
  name: string
  label: string
  defaultSections: SectionConfig[]
  maxAssetSizeMb: number
  allowedAssetTypes: string[]
}

export const CHANNEL_CONFIGS: Record<Channel, ChannelConfig> = {
  email: {
    name: 'email',
    label: 'Email Marketing',
    defaultSections: [
      {
        key: 'subject',
        label: 'Asunto',
        charLimit: 60,
        required: true,
        multiline: false,
        placeholder: 'Ej: Tu descuento de verano te espera',
      },
      {
        key: 'preheader',
        label: 'Preheader',
        charLimit: 85,
        required: false,
        multiline: false,
        placeholder: 'Ej: Solo por tiempo limitado...',
      },
      {
        key: 'body',
        label: 'Cuerpo',
        charLimit: null,
        required: true,
        multiline: true,
        placeholder: 'Cuerpo principal del email...',
      },
      {
        key: 'cta',
        label: 'CTA',
        charLimit: 30,
        required: true,
        multiline: false,
        placeholder: 'Ej: Quiero mi descuento',
      },
      {
        key: 'legal',
        label: 'Legales',
        charLimit: null,
        required: false,
        multiline: true,
        placeholder: 'Aplican restricciones...',
      },
    ],
    maxAssetSizeMb: 25,
    allowedAssetTypes: ['image/jpeg', 'image/png'],
  },
  whatsapp: {
    name: 'whatsapp',
    label: 'WhatsApp',
    defaultSections: [
      {
        key: 'body',
        label: 'Mensaje',
        charLimit: 1000,
        required: true,
        multiline: true,
        placeholder: 'Hola [nombre], te tenemos una oferta...',
      },
      {
        key: 'cta',
        label: 'CTA / Link',
        charLimit: 200,
        required: false,
        multiline: false,
        placeholder: 'Ej: Ver oferta → https://...',
      },
    ],
    maxAssetSizeMb: 25,
    allowedAssetTypes: ['image/jpeg', 'image/png'],
  },
  sms: {
    name: 'sms',
    label: 'SMS',
    defaultSections: [
      {
        key: 'body',
        label: 'Mensaje',
        charLimit: 160,
        required: true,
        multiline: false,
        placeholder: 'Máx 160 caracteres. Sin emojis.',
      },
    ],
    maxAssetSizeMb: 0,
    allowedAssetTypes: [],
  },
  paid_digital: {
    name: 'paid_digital',
    label: 'Pauta Digital',
    defaultSections: [
      {
        key: 'headline',
        label: 'Headline',
        charLimit: 40,
        required: true,
        multiline: false,
        placeholder: 'Titular principal de la pieza',
      },
      {
        key: 'description',
        label: 'Descripción',
        charLimit: 90,
        required: false,
        multiline: true,
        placeholder: 'Texto descriptivo...',
      },
      {
        key: 'cta',
        label: 'CTA',
        charLimit: 20,
        required: true,
        multiline: false,
        placeholder: 'Ej: Comprar ahora',
      },
      {
        key: 'legal',
        label: 'Legales',
        charLimit: null,
        required: false,
        multiline: true,
        placeholder: 'Aplican restricciones...',
      },
    ],
    maxAssetSizeMb: 25,
    allowedAssetTypes: ['image/jpeg', 'image/png'],
  },
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  email: 'Email Marketing',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  paid_digital: 'Pauta Digital',
}
