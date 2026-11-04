'use strict';
/* 小筛宝 A1Pal · 疾病概要数据（36 号四段：定义 → 医学资料规范和指南情况 → 治疗全景 → 发展趋势）
 * 口径：docs/DISEASE-PRIMER.md；家族规范 docs/36-DISEASE-PRIMER.md。
 * 边界：全部内容属第②层（解释）——只写定义、文件与指南列举过的手段、已经发生的变化。
 *   不生成任何针对个人的判断；固定出口两句：本段按受累器官与病情轻重排列 +
 *   「不代表任何一项适合你」「这一句需要问你的医生」。
 * 原件状态照实写：本台未取得下述任何指南/综述全文原件，均据公开可访问的稳定页面转引；
 *   写不准的条目宁可标「未取得原件，据二次来源」，不臆测版本号与页码。
 */
window.DISEASE_PRIMER = {
  brand: '小筛宝 A1Pal',
  name: 'α1-抗胰蛋白酶缺乏症',
  en: 'Alpha-1 Antitrypsin Deficiency (AATD)',
  updated: '2026-11-05',
  sections: [
    {
      id: 'definition',
      title: '定义',
      intro: 'α1-抗胰蛋白酶缺乏症（AATD）是一种可由 SERPINA1 基因变化引起的遗传性病变：'
        + '血液里起保护作用的 α1-抗胰蛋白酶蛋白不足时，肺泡组织长期缺少这层保护，部分人还会出现肝脏受累。'
        + '这台工作台把「医生记录了什么、哪一天说的」放在第一位，不替你推断受累程度。',
      points: [
        '受累器官以肺与肝为主：肺部常在体检或咳喘加重时被发现；肝脏部分的人可能多年没有感觉，化验与超声按医生安排随访。',
        '确认与分型靠血清 AAT 浓度测定和 SERPINA1 基因检测；本台只抄医生原话与报告原文，不做型别—病情的对应推断。',
        '血清 AAT 浓度只对血清学方法有意义；基因分型报告只存原文，界面不做重判读。',
        '未检测 ≠ 阴性：没查过的项目在这里显式空着，不填、不猜。'
      ],
      sources: [
        { org: 'GeneReviews（NCBI Bookshelf）', doc: 'Alpha-1 Antitrypsin Deficiency', version: '在线综述，更新日期以页面为准', original: false, page: '页码不适用',
          secondaryUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK1519/', note: '未取得原件，据 NCBI Bookshelf 综述页' },
        { org: 'MedlinePlus Genetics（美国国家医学图书馆）', doc: 'Alpha-1 antitrypsin deficiency', version: '在线条目', original: false, page: '页码不适用',
          secondaryUrl: 'https://medlineplus.gov/genetics/condition/alpha-1-antitrypsin-deficiency/', note: '未取得原件，据条目页；中文表述为本台整理' }
      ]
    },
    {
      id: 'evidence',
      title: '医学资料规范和指南情况',
      intro: '这台工作台里出现的「该查什么、多久随访、发作时怎么办」，都应能追到下面某一份文件。'
        + '本项目对下述文件只核对到「公开页面存在」这一层，全文未取得，版本号不写死。',
      table: {
        head: ['机构', '文件', '版本 / 年份', '原件', '本台的用途'],
        rows: [
          ['ATS / ERS', 'Standards for the diagnosis and management of individuals with alpha-1 antitrypsin deficiency（联合声明）', '2003（后续更新未核对）', { text: '未取得原件，据 PubMed 题录页', url: 'https://pubmed.ncbi.nlm.nih.gov/12859155/', kind: 'registry' }, '确诊路径与随访结构的一般对照；不引用具体条文'],
          ['GeneReviews', 'Alpha-1 Antitrypsin Deficiency', '在线综述（更新日期以页面为准）', { text: '未取得原件，据 NCBI Bookshelf 综述页', url: 'https://www.ncbi.nlm.nih.gov/books/NBK1519/', kind: 'fulltext' }, '受累器官（肺/肝）与家系筛查线索的表述边界'],
          ['NHLBI（美国心肺血研究所）', 'Alpha-1 antitrypsin deficiency 患教页', '在线页面', { text: '未取得原件，据官网患教页', url: 'https://www.nhlbi.nih.gov/health/alpha-1-antitrypsin-deficiency', kind: 'fulltext' }, '患者语言的措辞对照'],
          ['中国官方来源（国家卫生健康委）', '《86个罕见病病种诊疗指南（2025年版）》附件 PDF（AATD 为第 6 个病种，印刷页 27–32）', '2025 年版（国卫办医政函〔2025〕252号）', { text: '原件已下载核对（2026-11-05）', url: 'https://www.nhc.gov.cn/yzygj/c100068/202507/5b3f41180a42465eb9eec34597bacaf2/files/86%E4%B8%AA%E7%BD%95%E8%A7%81%E7%97%85%E7%97%85%E7%A7%8D%E8%AF%8A%E7%96%97%E6%8C%87%E5%8D%97%EF%BC%882025%E5%B9%B4%E7%89%88%EF%BC%89-20250709181724664.pdf', kind: 'pdf' }, '本台内容边界的权威来源；不复制指南临床条文']
        ]
      },
      points: [
        '指南给的是「通常怎么做」，不是「你该怎么做」；本台引用一律带机构与来源链接，查不到版本就写「版本未核对」。',
        '未取得原件的文件只记「存在」与「大致讲什么」，不引用其具体条文；上面的「原件」列给的是可点的公开页面，不冒充全文。',
        '所有阈值（如血清浓度的参考范围、肝功能上限）在通过临床审核前一律标【待核】，界面不做自动判定。'
      ],
      sources: [
        { org: 'ATS / ERS', doc: 'AATD 联合声明', version: '2003', original: false, page: '页码待核',
          secondaryUrl: 'https://pubmed.ncbi.nlm.nih.gov/12859155/', note: '据 PubMed 题录页；全文需订阅' },
        { org: 'GeneReviews', doc: 'Alpha-1 Antitrypsin Deficiency', version: '在线综述', original: false, page: '页码不适用',
          secondaryUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK1519/', note: '据 NCBI Bookshelf 综述页' }
      ]
    },
    {
      id: 'landscape',
      title: '目前治疗全景概要',
      intro: '下面按受累器官与病情轻重，列出公开资料里出现过的手段类别。这是「世界上大致有哪些办法」的地图，'
        + '按受累器官与病情轻重排列，不代表任何一项适合你——选哪一个，这一句需要问你的医生。',
      groups: [
        {
          label: '以肺受累为主时（公开资料中列出的类别）',
          points: [
            '发作—缓解管理：急性加重按医生给定的行动计划处理；本台只记「发作了、什么时候缓解、医生说了什么」。',
            '长期随访与康复：肺功能定期复查、戒烟支持、疫苗与运动计划在公开资料中被列为常规内容；具体项目由医生安排。',
            '蛋白补充治疗（每周一次输注）：以静脉输注方式补充 α1-抗胰蛋白酶蛋白；是否适用、用多久由医生决定，本台只做按次与缺口周的登记。',
            '肺移植：在病变很重、其他手段不够时被列为一种选择；本台不搬任何筛选或评估话术。'
          ]
        },
        {
          label: '以肝受累为主时（公开资料中列出的类别）',
          points: [
            '肝功能与影像随访：化验与超声按医生安排的节律进行；结果只抄原文，不做轻重的排序。',
            '肝移植：在病变很重时被列为一种选择；是否评估、何时评估由肝病科团队决定。'
          ]
        },
        {
          label: '贯穿全程的两件事',
          points: [
            '家系沟通：一级亲属是否筛查由每个人自己决定；本台只记医生原话与筛查条目，不判定任何家族成员的风险。',
            '生活负担：戒烟支持、照护者的精力与工作影响是长期话题；本台提供记录位，不提供方法建议。'
          ]
        }
      ],
      points: [
        '以上是公开资料里列出的手段类别，按受累器官与病情轻重排列，不代表任何一项适合你；这一句需要问你的医生。'
      ],
      sources: [
        { org: 'GeneReviews', doc: 'Alpha-1 Antitrypsin Deficiency', version: '在线综述', original: false, page: '页码不适用',
          secondaryUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK1519/', note: '未取得原件，据 NCBI Bookshelf 综述页' },
        { org: 'MedlinePlus Genetics', doc: 'Alpha-1 antitrypsin deficiency', version: '在线条目', original: false, page: '页码不适用',
          secondaryUrl: 'https://medlineplus.gov/genetics/condition/alpha-1-antitrypsin-deficiency/', note: '未取得原件，据条目页' }
      ]
    },
    {
      id: 'trend',
      title: '发展趋势',
      intro: '这一段只写已经发生的事：哪一年出现了什么、本台核对过什么渠道。不写预测，不做评价。',
      points: [
        '2003 年：ATS 与 ERS 发布 AATD 诊断与管理的联合声明（题录见 PubMed），此后多家机构陆续发布综述与患教材料（本台未逐一取得原件）。',
        '2026-11-05（本版核对）：GeneReviews 综述页、MedlinePlus Genetics 条目页、NHLBI 患教页均可公开访问；ATS/ERS 声明全文需订阅，本台只核对到题录一层。',
        '截至本版：中国官方来源的可稳定在线引用页面未检索到，中国登记与规范覆盖留空、如实声明；不转引二手说法。'
      ],
      sources: [
        { org: 'ATS / ERS', doc: 'AATD 联合声明', version: '2003', original: false, page: '页码待核',
          secondaryUrl: 'https://pubmed.ncbi.nlm.nih.gov/12859155/', note: '据 PubMed 题录页核对存在；全文未取得' },
        { org: 'GeneReviews / MedlinePlus / NHLBI', doc: '三个公开页面的访问核对', version: '核对日 2026-11-05', original: true, nolink: true,
          note: '本机核对记录：三页均可访问（https 链接见上方各段）；访问成功不等于医学正确，临床审核前一律占位' }
      ]
    }
  ]
};
