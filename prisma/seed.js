const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const school = await prisma.school.upsert({
    where: { shortName: 'GCUOBA' },
    update: {},
    create: {
      name: 'Government College Umuahia Old Boys Association',
      shortName: 'GCUOBA',
      description: 'The alumni association for Old Boys of Government College Umuahia.',
      primaryColor: '#9C0621',
    },
  })

  console.log(`GCUOBA tenant ready (${school.id}).`)
}

main()
  .catch((error) => {
    console.error('Failed to seed the GCUOBA tenant.', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
