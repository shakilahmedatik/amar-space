import { describe, expect, it } from 'vitest'
import {
  portalBloodGroupEnum,
  portalDigitalSignatureSchema,
  portalEmergencyContactSchema,
  portalNidSchema,
  portalPhoneSchema,
  portalRentalStartDateSchema,
  registrationFormSchema,
  validateRegistrationForm,
} from './registration-validation'

function getValidInput() {
  const today = new Date()
  today.setDate(today.getDate() + 7) // 7 days from now
  const dateStr = today.toISOString().split('T')[0]

  return {
    fullName: 'মোহাম্মদ আলী',
    phone: '01712345678',
    nidNumber: '1234567890',
    nidPhoto:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    selfiePhoto:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    bloodGroup: 'A+' as const,
    occupation: 'প্রকৌশলী',
    familyMembers: 4,
    familyMemberNames: ['সদস্য ১', 'সদস্য ২', 'সদস্য ৩', 'সদস্য ৪'],
    emergencyContactName: 'হাসান আলী',
    emergencyContact: '01812345678',
    emergencyContactRelationship: 'ভাই',
    rentalStartDate: dateStr,
    advanceAmount: 50000,
    digitalSignature:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  }
}

describe('registrationFormSchema', () => {
  it('accepts valid registration input', () => {
    const result = registrationFormSchema.safeParse(getValidInput())
    expect(result.success).toBe(true)
  })

  it('rejects empty input', () => {
    const result = registrationFormSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('fullName validation', () => {
  it('rejects empty full name', () => {
    const input = { ...getValidInput(), fullName: '' }
    const result = registrationFormSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects full name exceeding 100 characters', () => {
    const input = { ...getValidInput(), fullName: 'ক'.repeat(101) }
    const result = registrationFormSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('accepts full name at exactly 100 characters', () => {
    const input = { ...getValidInput(), fullName: 'ক'.repeat(100) }
    const result = registrationFormSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('accepts single character full name', () => {
    const input = { ...getValidInput(), fullName: 'আ' }
    const result = registrationFormSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

describe('portalPhoneSchema', () => {
  it('accepts valid Bangladeshi phone numbers', () => {
    expect(portalPhoneSchema.safeParse('01712345678').success).toBe(true)
    expect(portalPhoneSchema.safeParse('01912345678').success).toBe(true)
    expect(portalPhoneSchema.safeParse('01312345678').success).toBe(true)
  })

  it('rejects phone not starting with 01', () => {
    expect(portalPhoneSchema.safeParse('02712345678').success).toBe(false)
  })

  it('rejects phone with fewer than 11 digits', () => {
    expect(portalPhoneSchema.safeParse('0171234567').success).toBe(false)
  })

  it('rejects phone with more than 11 digits', () => {
    expect(portalPhoneSchema.safeParse('017123456789').success).toBe(false)
  })

  it('rejects non-numeric phone', () => {
    expect(portalPhoneSchema.safeParse('0171234abcd').success).toBe(false)
  })

  it('returns Bangla error message', () => {
    const result = portalPhoneSchema.safeParse('123')
    expect(result.success).toBe(false)
    if (!result.success) {
      const firstIssue = result.error.issues[0]
      expect(firstIssue).toBeDefined()
      expect(firstIssue!.message).toContain('ফোন নম্বর')
    }
  })
})

describe('portalNidSchema', () => {
  it('accepts 10-digit NID', () => {
    expect(portalNidSchema.safeParse('1234567890').success).toBe(true)
  })

  it('accepts 17-digit NID', () => {
    expect(portalNidSchema.safeParse('12345678901234567').success).toBe(true)
  })

  it('rejects 9-digit NID', () => {
    expect(portalNidSchema.safeParse('123456789').success).toBe(false)
  })

  it('rejects 11-digit NID', () => {
    expect(portalNidSchema.safeParse('12345678901').success).toBe(false)
  })

  it('rejects 16-digit NID', () => {
    expect(portalNidSchema.safeParse('1234567890123456').success).toBe(false)
  })

  it('rejects 18-digit NID', () => {
    expect(portalNidSchema.safeParse('123456789012345678').success).toBe(false)
  })

  it('rejects non-numeric NID', () => {
    expect(portalNidSchema.safeParse('12345abcde').success).toBe(false)
  })

  it('returns Bangla error message', () => {
    const result = portalNidSchema.safeParse('123')
    expect(result.success).toBe(false)
    if (!result.success) {
      const firstIssue = result.error.issues[0]
      expect(firstIssue).toBeDefined()
      expect(firstIssue!.message).toContain('জাতীয় পরিচয়পত্র')
    }
  })
})

describe('portalBloodGroupEnum', () => {
  it('accepts all valid blood groups', () => {
    const validGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
    for (const group of validGroups) {
      expect(portalBloodGroupEnum.safeParse(group).success).toBe(true)
    }
  })

  it('rejects invalid blood groups', () => {
    expect(portalBloodGroupEnum.safeParse('C+').success).toBe(false)
    expect(portalBloodGroupEnum.safeParse('').success).toBe(false)
    expect(portalBloodGroupEnum.safeParse('AB').success).toBe(false)
  })
})

describe('familyMembers validation', () => {
  it('accepts values between 1 and 20', () => {
    const input1 = { ...getValidInput(), familyMembers: 1 }
    expect(registrationFormSchema.safeParse(input1).success).toBe(true)

    const input20 = { ...getValidInput(), familyMembers: 20 }
    expect(registrationFormSchema.safeParse(input20).success).toBe(true)
  })

  it('rejects 0 family members', () => {
    const input = { ...getValidInput(), familyMembers: 0 }
    expect(registrationFormSchema.safeParse(input).success).toBe(false)
  })

  it('rejects more than 20 family members', () => {
    const input = { ...getValidInput(), familyMembers: 21 }
    expect(registrationFormSchema.safeParse(input).success).toBe(false)
  })

  it('rejects non-integer family members', () => {
    const input = { ...getValidInput(), familyMembers: 2.5 }
    expect(registrationFormSchema.safeParse(input).success).toBe(false)
  })
})

describe('portalEmergencyContactSchema', () => {
  it('accepts valid emergency contact', () => {
    expect(portalEmergencyContactSchema.safeParse('01812345678').success).toBe(
      true,
    )
  })

  it('rejects invalid emergency contact', () => {
    expect(portalEmergencyContactSchema.safeParse('02812345678').success).toBe(
      false,
    )
    expect(portalEmergencyContactSchema.safeParse('0181234567').success).toBe(
      false,
    )
  })
})

describe('portalRentalStartDateSchema', () => {
  it('accepts today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(portalRentalStartDateSchema.safeParse(today).success).toBe(true)
  })

  it('accepts a date within 90 days', () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    const dateStr = future.toISOString().split('T')[0]
    expect(portalRentalStartDateSchema.safeParse(dateStr).success).toBe(true)
  })

  it('rejects a past date', () => {
    const past = new Date()
    past.setDate(past.getDate() - 1)
    const dateStr = past.toISOString().split('T')[0]
    expect(portalRentalStartDateSchema.safeParse(dateStr).success).toBe(false)
  })

  it('rejects a date more than 90 days in the future', () => {
    const farFuture = new Date()
    farFuture.setDate(farFuture.getDate() + 91)
    const dateStr = farFuture.toISOString().split('T')[0]
    expect(portalRentalStartDateSchema.safeParse(dateStr).success).toBe(false)
  })

  it('rejects invalid date format', () => {
    expect(portalRentalStartDateSchema.safeParse('2024/01/01').success).toBe(
      false,
    )
    expect(portalRentalStartDateSchema.safeParse('01-01-2024').success).toBe(
      false,
    )
  })
})

describe('advanceAmount validation', () => {
  it('accepts 0', () => {
    const input = { ...getValidInput(), advanceAmount: 0 }
    expect(registrationFormSchema.safeParse(input).success).toBe(true)
  })

  it('accepts maximum value 99,999,999', () => {
    const input = { ...getValidInput(), advanceAmount: 99_999_999 }
    expect(registrationFormSchema.safeParse(input).success).toBe(true)
  })

  it('rejects negative values', () => {
    const input = { ...getValidInput(), advanceAmount: -1 }
    expect(registrationFormSchema.safeParse(input).success).toBe(false)
  })

  it('rejects values exceeding 99,999,999', () => {
    const input = { ...getValidInput(), advanceAmount: 100_000_000 }
    expect(registrationFormSchema.safeParse(input).success).toBe(false)
  })
})

describe('portalDigitalSignatureSchema', () => {
  it('accepts valid base64 string', () => {
    expect(
      portalDigitalSignatureSchema.safeParse(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      ).success,
    ).toBe(true)
  })

  it('accepts base64 with data URI prefix', () => {
    expect(
      portalDigitalSignatureSchema.safeParse(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
      ).success,
    ).toBe(true)
  })

  it('rejects empty string', () => {
    expect(portalDigitalSignatureSchema.safeParse('').success).toBe(false)
  })
})

describe('validateRegistrationForm', () => {
  it('returns success with data for valid input', () => {
    const result = validateRegistrationForm(getValidInput())
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.errors).toBeUndefined()
  })

  it('returns errors map for invalid input', () => {
    const result = validateRegistrationForm({
      fullName: '',
      phone: '123',
      nidNumber: '123',
      nidPhoto: 'invalid',
      selfiePhoto: 'invalid',
      bloodGroup: 'X',
      occupation: '',
      familyMembers: 0,
      familyMemberNames: [''],
      emergencyContactName: '',
      emergencyContact: '123',
      emergencyContactRelationship: '',
      rentalStartDate: 'invalid',
      advanceAmount: -1,
      digitalSignature: '',
    })
    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
    expect(Object.keys(result.errors!).length).toBeGreaterThan(0)
  })

  it('returns Bangla error messages', () => {
    const result = validateRegistrationForm({
      fullName: '',
      phone: '123',
      nidNumber: '123',
      nidPhoto: 'invalid',
      selfiePhoto: 'invalid',
      bloodGroup: 'X',
      occupation: '',
      familyMembers: 0,
      familyMemberNames: [''],
      emergencyContactName: '',
      emergencyContact: '123',
      emergencyContactRelationship: '',
      rentalStartDate: 'invalid',
      advanceAmount: -1,
      digitalSignature: '',
    })
    expect(result.success).toBe(false)
    // All error messages should contain Bangla characters
    for (const message of Object.values(result.errors!)) {
      expect(message).toMatch(/[\u0980-\u09FF]/)
    }
  })

  it('returns one error per field', () => {
    const result = validateRegistrationForm({})
    expect(result.success).toBe(false)
    // Each field should have at most one error
    const fieldCounts = new Map<string, number>()
    for (const field of Object.keys(result.errors!)) {
      fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1)
    }
    for (const count of fieldCounts.values()) {
      expect(count).toBe(1)
    }
  })
})
