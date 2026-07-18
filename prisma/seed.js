import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const defaults = [
    { settingKey: 'phone',         settingValue: '(636) 252-4203' },
    { settingKey: 'email',         settingValue: 'info@missouriconstructionservice.com' },
    { settingKey: 'address',       settingValue: 'St. Louis, MO' },
    { settingKey: 'hours_weekday', settingValue: 'Monday – Friday: 7:00am – 6:00pm' },
    { settingKey: 'hours_weekend', settingValue: 'Saturday: 8:00am – 4:00pm' },
  ]

  for (const s of defaults) {
    await prisma.siteSetting.upsert({
      where:  { settingKey: s.settingKey },
      update: {},
      create: s,
    })
  }

  console.log('✅ Seed complete — default settings inserted.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
