import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash("secretary123", 10);

  const admin = await prisma.adminUser.upsert({
    where: { username: "secretary" },
    update: {},
    create: {
      username: "secretary",
      passwordHash,
      name: "م. فهد المطيري",
      nationalId: "9000000001",
    },
  });

  const company = await prisma.company.upsert({
    where: { slug: "alofoq" },
    update: {},
    create: {
      name: "شركة الأفق القابضة",
      slug: "alofoq",
      crNumber: "1010512345",
      themeColor: "#0F172A",
    },
  });

  const existingAssembly = await prisma.assembly.findFirst({
    where: { companyId: company.id },
  });

  if (existingAssembly) {
    console.log("✅ Demo data already exists. Skipping.");
    return;
  }

  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + 1);
  scheduledAt.setHours(19, 0, 0, 0);

  const assembly = await prisma.assembly.create({
    data: {
      companyId: company.id,
      title: "الجمعية العامة العادية الرابعة - 2026",
      type: "ORDINARY",
      status: "ACTIVE",
      scheduledAt,
      streamUrl: "https://www.youtube.com/embed/x2PDtYGBIdM",
      quorumPercentage: 50,
      agendaItems: {
        create: [
          {
            orderIndex: 1,
            title: "التصويت على تقرير مجلس الإدارة للعام المالي المنتهي",
            description:
              "مناقشة والتصويت على تقرير مجلس الإدارة عن نشاطات الشركة وأدائها للعام المالي المنتهي.",
            votingType: "STANDARD",
            status: "OPEN",
          },
          {
            orderIndex: 2,
            title: "التصويت على القوائم المالية وتقرير مراجع الحسابات",
            description:
              "التصويت على القوائم المالية المدققة للعام المالي المنتهي وتقرير مراجع الحسابات المستقل.",
            votingType: "STANDARD",
            status: "OPEN",
          },
          {
            orderIndex: 3,
            title: "التصويت على توزيع أرباح نقدية بواقع 1.5 ريال للسهم",
            description:
              "الاعتماد على توزيع أرباح نقدية على المساهمين بواقع 1.5 ريال للسهم لمدة ستة أشهر.",
            votingType: "STANDARD",
            status: "OPEN",
          },
          {
            orderIndex: 4,
            title: "التصويت على انتخاب أعضاء مجلس الإدارة",
            description:
              "انتخاب أعضاء مجلس الإدارة لالدورة الانتخابية القادمة وفق مبدأ التصويت التراكمي (التصويت المرجّح بالأسهم).",
            votingType: "CUMULATIVE",
            seatsCount: 3,
            status: "DRAFT",
          },
        ],
      },
      shareholders: {
        create: [
          {
            name: "عبدالرحمن عبدالله",
            nationalId: "1010101010",
            mobile: "0551111111",
            email: "abdulrahman@demo.sa",
            sharesCount: 450000,
          },
          {
            name: "سارة محمد",
            nationalId: "1020202020",
            mobile: "0552222222",
            email: "sara@demo.sa",
            sharesCount: 300000,
          },
          {
            name: "شركة الاستثمار المتقدم",
            nationalId: "7001234567",
            mobile: "0112345678",
            email: "corp@demo.sa",
            sharesCount: 250000,
          },
        ],
      },
      auditLogs: {
        create: [
          {
            actorName: admin.name,
            actorRole: "SECRETARY",
            action: "إنشاء الجمعية",
            details: "تم إنشاء الجمعية العامة العادية الرابعة - 2026 وفتح باب التصويت للبنود التقريرية",
          },
        ],
      },
    },
  });

  const shareholders = await prisma.shareholder.findMany({
    where: { assemblyId: assembly.id },
  });
  const byName = Object.fromEntries(shareholders.map((s) => [s.name, s]));

  // سارة محمد delega a خالد العامري — approved proxy (demo proxy login)
  await prisma.proxy.create({
    data: {
      assemblyId: assembly.id,
      shareholderId: byName["سارة محمد"].id,
      proxyName: "خالد العامري",
      proxyNationalId: "1050505050",
      proxyMobile: "0555555555",
      proxyEmail: "khalid@demo.sa",
      documentUrl: null,
      status: "APPROVED",
      approvedBy: admin.name,
      approvedAt: new Date(),
    },
  });

  // عبدالرحمن عبدالله submitted a pending proxy request (approval queue demo)
  await prisma.proxy.create({
    data: {
      assemblyId: assembly.id,
      shareholderId: byName["عبدالرحمن عبدالله"].id,
      proxyName: "نواف القحطاني",
      proxyNationalId: "1060606060",
      proxyMobile: "0556666666",
      proxyEmail: "nawaf@demo.sa",
      documentUrl: null,
      status: "PENDING",
    },
  });

  console.log("✅ Seed completed:");
  console.log("   Company: شركة الأفق القابضة (/c/alofoq)");
  console.log("   Secretary: أمين السر (ID: 9000000001 أو username: secretary)");
  console.log("   Shareholders: 1010101010 (45%), 1020202020 (30%), 7001234567 (25%)");
  console.log("   Approved proxy: 1050505050 (خالد العامري)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
