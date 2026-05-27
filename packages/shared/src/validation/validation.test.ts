import { describe, expect, it } from 'vitest'
import {
  addUtilityChargeSchema,
  applyAdjustmentSchema,
  bdPhoneSchema,
  bloodGroupEnum,
  createBuildingSchema,
  createFlatSchema,
  createIssueSchema,
  createMaintenanceRequestSchema,
  createNoticeSchema,
  emailSchema,
  fileUploadSchema,
  generateBillsSchema,
  loginSchema,
  nidSchema,
  passwordSchema,
  recordPaymentSchema,
  registerRenterSchema,
  registerSchema,
} from './index'

describe('emailSchema', () => {
  it('accepts valid emails and normalizes to lowercase', () => {
    const result = emailSchema.safeParse('Test@Example.COM')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('test@example.com')
    }
  })

  it('rejects invalid emails', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false)
    expect(emailSchema.safeParse('').success).toBe(false)
  })

  it('rejects emails exceeding 254 characters', () => {
    const longEmail = `${'a'.repeat(250)}@b.co`
    expect(emailSchema.safeParse(longEmail).success).toBe(false)
  })
})

describe('passwordSchema', () => {
  it('accepts valid passwords', () => {
    expect(passwordSchema.safeParse('Abcdef1g').success).toBe(true)
    expect(passwordSchema.safeParse('StrongPass123').success).toBe(true)
  })

  it('rejects passwords shorter than 8 characters', () => {
    expect(passwordSchema.safeParse('Ab1cdef').success).toBe(false)
  })

  it('rejects passwords without uppercase', () => {
    expect(passwordSchema.safeParse('abcdefg1').success).toBe(false)
  })

  it('rejects passwords without lowercase', () => {
    expect(passwordSchema.safeParse('ABCDEFG1').success).toBe(false)
  })

  it('rejects passwords without digit', () => {
    expect(passwordSchema.safeParse('Abcdefgh').success).toBe(false)
  })

  it('rejects passwords exceeding 128 characters', () => {
    const longPass = 'A' + 'a'.repeat(126) + '1' + 'x'
    expect(passwordSchema.safeParse(longPass).success).toBe(false)
  })
})

describe('registerSchema', () => {
  it('accepts valid registration input', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing fields', () => {
    expect(registerSchema.safeParse({}).success).toBe(false)
    expect(registerSchema.safeParse({ email: 'a@b.com' }).success).toBe(false)
  })
})

describe('bdPhoneSchema', () => {
  it('accepts valid Bangladeshi phone numbers', () => {
    expect(bdPhoneSchema.safeParse('01712345678').success).toBe(true)
    expect(bdPhoneSchema.safeParse('01912345678').success).toBe(true)
  })

  it('rejects invalid phone numbers', () => {
    expect(bdPhoneSchema.safeParse('1712345678').success).toBe(false) // missing leading 0
    expect(bdPhoneSchema.safeParse('02712345678').success).toBe(false) // doesn't start with 01
    expect(bdPhoneSchema.safeParse('0171234567').success).toBe(false) // too short
    expect(bdPhoneSchema.safeParse('017123456789').success).toBe(false) // too long
  })
})

describe('nidSchema', () => {
  it('accepts valid NID numbers (10-17 digits)', () => {
    expect(nidSchema.safeParse('1234567890').success).toBe(true)
    expect(nidSchema.safeParse('12345678901234567').success).toBe(true)
  })

  it('rejects invalid NID numbers', () => {
    expect(nidSchema.safeParse('123456789').success).toBe(false) // too short
    expect(nidSchema.safeParse('123456789012345678').success).toBe(false) // too long
    expect(nidSchema.safeParse('12345abcde').success).toBe(false) // non-numeric
  })
})

describe('bloodGroupEnum', () => {
  it('accepts all valid blood groups', () => {
    const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    for (const group of validGroups) {
      expect(bloodGroupEnum.safeParse(group).success).toBe(true)
    }
  })

  it('rejects invalid blood groups', () => {
    expect(bloodGroupEnum.safeParse('C+').success).toBe(false)
    expect(bloodGroupEnum.safeParse('').success).toBe(false)
  })
})

describe('createBuildingSchema', () => {
  it('accepts valid building input', () => {
    const result = createBuildingSchema.safeParse({
      name: 'Green Tower',
      address: '123 Main St, Dhaka',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional totalFloors', () => {
    const result = createBuildingSchema.safeParse({
      name: 'Green Tower',
      address: '123 Main St',
      totalFloors: 10,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createBuildingSchema.safeParse({
      name: '',
      address: '123 Main St',
    })
    expect(result.success).toBe(false)
  })

  it('rejects totalFloors outside range', () => {
    expect(
      createBuildingSchema.safeParse({
        name: 'A',
        address: 'B',
        totalFloors: 0,
      }).success,
    ).toBe(false)
    expect(
      createBuildingSchema.safeParse({
        name: 'A',
        address: 'B',
        totalFloors: 201,
      }).success,
    ).toBe(false)
  })
})

describe('createFlatSchema', () => {
  it('accepts valid flat input', () => {
    const result = createFlatSchema.safeParse({
      buildingId: '550e8400-e29b-41d4-a716-446655440000',
      flatNumber: 'A-101',
      floor: 1,
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-alphanumeric flat numbers', () => {
    const result = createFlatSchema.safeParse({
      buildingId: '550e8400-e29b-41d4-a716-446655440000',
      flatNumber: 'A 101',
      floor: 1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects floor outside range', () => {
    expect(
      createFlatSchema.safeParse({
        buildingId: '550e8400-e29b-41d4-a716-446655440000',
        flatNumber: 'A1',
        floor: 0,
      }).success,
    ).toBe(false)
  })
})

describe('registerRenterSchema', () => {
  const validRenter = {
    fullName: 'John Doe',
    phone: '01712345678',
    nidNumber: '1234567890',
    occupation: 'Engineer',
    bloodGroup: 'A+',
    totalFamilyMembers: 4,
    emergencyContactName: 'Jane Doe',
    emergencyContactNumber: '01812345678',
    emergencyContactRelationship: 'Spouse',
    flatId: '550e8400-e29b-41d4-a716-446655440000',
    monthlyRent: 15000,
    startDate: '2024-01-01',
    advanceAmount: 30000,
  }

  it('accepts valid renter registration', () => {
    expect(registerRenterSchema.safeParse(validRenter).success).toBe(true)
  })

  it('accepts optional fields', () => {
    const result = registerRenterSchema.safeParse({
      ...validRenter,
      dateOfBirth: '1990-05-15',
      familyMemberNames: ['Alice', 'Bob'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid totalFamilyMembers', () => {
    expect(
      registerRenterSchema.safeParse({ ...validRenter, totalFamilyMembers: 0 })
        .success,
    ).toBe(false)
    expect(
      registerRenterSchema.safeParse({ ...validRenter, totalFamilyMembers: 51 })
        .success,
    ).toBe(false)
  })

  it('rejects too many family member names', () => {
    const result = registerRenterSchema.safeParse({
      ...validRenter,
      familyMemberNames: Array.from({ length: 21 }, (_, i) => `Member ${i}`),
    })
    expect(result.success).toBe(false)
  })
})

describe('generateBillsSchema', () => {
  it('accepts valid billing month', () => {
    expect(
      generateBillsSchema.safeParse({ billingMonth: '2024-01' }).success,
    ).toBe(true)
    expect(
      generateBillsSchema.safeParse({ billingMonth: '2024-12' }).success,
    ).toBe(true)
  })

  it('rejects invalid billing month format', () => {
    expect(
      generateBillsSchema.safeParse({ billingMonth: '2024-1' }).success,
    ).toBe(false)
    expect(
      generateBillsSchema.safeParse({ billingMonth: '2024-13' }).success,
    ).toBe(false)
    expect(
      generateBillsSchema.safeParse({ billingMonth: '2024/01' }).success,
    ).toBe(false)
  })
})

describe('addUtilityChargeSchema', () => {
  it('accepts valid utility charge', () => {
    const result = addUtilityChargeSchema.safeParse({
      description: 'Water bill',
      amount: 500,
    })
    expect(result.success).toBe(true)
  })

  it('rejects amount below minimum', () => {
    expect(
      addUtilityChargeSchema.safeParse({ description: 'X', amount: 0 }).success,
    ).toBe(false)
  })

  it('rejects amount above maximum', () => {
    expect(
      addUtilityChargeSchema.safeParse({ description: 'X', amount: 1_000_000 })
        .success,
    ).toBe(false)
  })
})

describe('recordPaymentSchema', () => {
  it('accepts valid payment', () => {
    const result = recordPaymentSchema.safeParse({
      billId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 15000,
      paymentDate: '2024-01-15',
      paymentMethod: 'cash',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional note', () => {
    const result = recordPaymentSchema.safeParse({
      billId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 15000,
      paymentDate: '2024-01-15',
      paymentMethod: 'bank_transfer',
      note: 'January rent',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid payment method', () => {
    const result = recordPaymentSchema.safeParse({
      billId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 15000,
      paymentDate: '2024-01-15',
      paymentMethod: 'credit_card',
    })
    expect(result.success).toBe(false)
  })
})

describe('createMaintenanceRequestSchema', () => {
  it('accepts valid maintenance request', () => {
    const result = createMaintenanceRequestSchema.safeParse({
      title: 'Leaking faucet in kitchen',
      description: 'The kitchen faucet has been leaking for two days',
      priority: 'medium',
    })
    expect(result.success).toBe(true)
  })

  it('rejects title shorter than 5 characters', () => {
    const result = createMaintenanceRequestSchema.safeParse({
      title: 'Leak',
      description: 'The kitchen faucet has been leaking',
      priority: 'medium',
    })
    expect(result.success).toBe(false)
  })

  it('rejects description shorter than 10 characters', () => {
    const result = createMaintenanceRequestSchema.safeParse({
      title: 'Leaking faucet',
      description: 'Short',
      priority: 'medium',
    })
    expect(result.success).toBe(false)
  })
})

describe('createIssueSchema', () => {
  it('accepts valid issue', () => {
    const result = createIssueSchema.safeParse({
      buildingId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Broken elevator',
      description: 'The main elevator is not working',
      category: 'electrical',
      priority: 'high',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid category', () => {
    const result = createIssueSchema.safeParse({
      buildingId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Issue',
      description: 'Desc',
      category: 'invalid_category',
      priority: 'high',
    })
    expect(result.success).toBe(false)
  })
})

describe('createNoticeSchema', () => {
  it('accepts valid notice for all renters', () => {
    const result = createNoticeSchema.safeParse({
      title: 'Building maintenance',
      body: 'Water supply will be interrupted tomorrow',
      targetAudience: 'all_renters',
    })
    expect(result.success).toBe(true)
  })

  it('requires buildingId for specific_building target', () => {
    const result = createNoticeSchema.safeParse({
      title: 'Building notice',
      body: 'Important notice for building residents',
      targetAudience: 'specific_building',
    })
    expect(result.success).toBe(false)
  })

  it('accepts specific_building with buildingId', () => {
    const result = createNoticeSchema.safeParse({
      title: 'Building notice',
      body: 'Important notice for building residents',
      targetAudience: 'specific_building',
      targetBuildingId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('requires flatId for specific_flat target', () => {
    const result = createNoticeSchema.safeParse({
      title: 'Flat notice',
      body: 'Important notice for flat resident',
      targetAudience: 'specific_flat',
    })
    expect(result.success).toBe(false)
  })
})

describe('fileUploadSchema', () => {
  it('accepts valid file upload', () => {
    const result = fileUploadSchema.safeParse({
      fileName: 'nid-photo.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024 * 1024, // 1MB
    })
    expect(result.success).toBe(true)
  })

  it('rejects files exceeding 5MB', () => {
    const result = fileUploadSchema.safeParse({
      fileName: 'large-file.jpg',
      mimeType: 'image/jpeg',
      fileSize: 6 * 1024 * 1024,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid MIME types', () => {
    const result = fileUploadSchema.safeParse({
      fileName: 'doc.txt',
      mimeType: 'text/plain',
      fileSize: 1024,
    })
    expect(result.success).toBe(false)
  })
})
