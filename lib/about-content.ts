export const timeline = [
  {
    year: '1929',
    title: 'Government College Umuahia is founded',
    text: 'Reverend Robert Fisher opened the gates of the College on 29 January 1929 to 25 students drawn from Nigeria and other parts of West Africa, with a catchment in Eastern Nigeria and the Southern Cameroons. The College began as a teacher-training institute.',
  },
  {
    year: '1930',
    title: 'A secondary school',
    text: 'The College was converted from its initial teacher-training role into a secondary school.',
  },
  {
    year: '1933–1939',
    title: 'Kenneth C. Murray and the art tradition',
    text: 'The English artist and archaeologist Kenneth C. Murray taught art at the College and started its Art Gallery, helping to establish an important artistic tradition.',
  },
  {
    year: '1939',
    title: 'Change of leadership',
    text: 'At the start of the Second World War, Fisher left for England on retirement and was replaced by W. N. Tolfree.',
  },
  {
    year: '1940',
    title: 'Closure in wartime',
    text: 'On 4 July 1940 the College was closed and its campus used as an internment camp for Germans and Italians captured in the Cameroons, despite strong local protest. Some students were sent to King\u2019s College, Lagos; the rest were distributed to mission schools around the region.',
  },
  {
    year: '1941',
    title: 'Reopening begins',
    text: 'The colonial Education Department reopened the College, admitting 19 students to King\u2019s College as Umuahia Form I, with 20 more the following year.',
  },
  {
    year: '1943',
    title: 'Return to Umudike',
    text: 'In April 1943 the College relocated to the Umudike campus. Classes officially resumed on 2 July 1943, exactly three years after the closure.',
  },
] as const

export const heritageSections = [
  {
    id: 'academic',
    title: 'Academic tradition',
    paragraphs: [
      'The College has drawn students from among the best performing in Nigeria and the Southern Cameroons. Its students are recorded as consistently achieving high scores in O-Level and A-Level examinations, and all students complete core courses in the Arts and Sciences.',
    ],
  },
  {
    id: 'arts',
    title: 'Arts and creativity',
    paragraphs: [
      'Kenneth C. Murray, who left Balliol College, Oxford to teach art in Nigeria, is recorded as a pioneer of modern art education in the country. He taught at Government College Umuahia from 1933 to 1939 and started the Art Gallery, whose collection included works by C. C. Ibeto and Uthman Ibrahim and early charcoal drawings by Ben Enwonwu.',
      'The gallery was looted and destroyed during the Nigerian\u2013Biafran civil war (1967\u201370), when the school was closed and used as a General Staff Headquarters.',
    ],
  },
  {
    id: 'literary',
    title: 'Literary heritage',
    paragraphs: [
      'The College is recorded as having produced an unusually high number of literary figures who influenced African literature.',
    ],
  },
  {
    id: 'sport',
    title: 'Sport',
    paragraphs: [
      'Students take part in sports including cricket, hockey, handball and football. Facilities recorded for the College include the Upper and Lower fields, cricket pavilions, seven lawn tennis courts, a basketball court and an Olympic-size track.',
    ],
  },
  {
    id: 'leadership',
    title: 'Leadership and service',
    paragraphs: [
      'The College had an Officer Cadet Corps offering instruction camps in field drills and adventure training. Before the civil war it produced professionally trained military officers, among them General George Kurubo, the first Southern Nigerian trained at Sandhurst and first Nigerian Chief of the Nigerian Air Force.',
    ],
  },
] as const

export const anthem = [
  ['We lift our voice to thee, O Lord', 'To Thee we sing with one accord', 'To grant us through Thy Son Adored', 'The will to shine as one.'],
  ['From Morning till the approach of Night', 'With humble minds, with all our might', 'We seek this gift which is Thy Light', 'The will to shine as one.'],
  ['As all of us, or black or white', 'Beseech Thee now us to unite', 'That all may seek this gift Thy Light', 'The will to shine as one.'],
  ['We beg thee now to show the way', 'That all of us may kneel and pray', 'And seek and keep from day to day', 'The will to shine as one.'],
] as const

// Names and years are reproduced exactly as published by the GCUOBA UK reference page.
export const principals: { name: string; years: string; acting?: boolean; note?: string }[] = [
  { name: 'Rev Robert Fisher', years: '1927 – 1937' },
  { name: 'Mr. W.N. Tolfree', years: '1937 – 1940' },
  { name: 'Mr. W.H. Thorp', years: '1943', acting: true },
  { name: 'Mr. E.C. Hicks', years: '1943 – 1944' },
  { name: 'Mr. William Simpson OBE', years: '1944 – 1951' },
  { name: 'Mr. A.B. Cozens', years: '1952 – 1955' },
  { name: 'Mr. James Prable', years: '1955', acting: true },
  { name: 'Mr. A.K. Wareham', years: '1955 – 1961' },
  { name: 'Mr. J.O. Wachukwu', years: '1962', acting: true },
  { name: 'Dr. I.D. Erekosima', years: '1962 – 1965' },
  { name: 'Mr. So.O. Ogujawa', years: '1965 – 1970' },
  { name: 'Mr. Agwu O. Uche', years: '1970 – 1972' },
  { name: 'Mr. S.O. Ogazi', years: '1972 – 1974' },
  { name: 'Mr. U. Udu', years: '1974 – 1975', acting: true },
  { name: 'Chief I. Nwauche', years: '1975 – 1977' },
  { name: 'Mr. O.O. Otisi', years: '1977 – 1980' },
  { name: 'Mr. J. Nworgu', years: '1980 – 1984' },
  { name: 'Mr. E. Nduka', years: '1984 – 1985' },
  { name: 'Mr. P.P.A. Amadi', years: '1985 – 1991' },
  { name: 'Mr. T.N. Onwumere', years: '1991 – 2000' },
  { name: 'Elder C.C. Elekwa', years: '2000 – 2006' },
  { name: 'Dr. Uvere Kana', years: '2006 – 2010' },
  { name: 'Mr. C.A. Ugah', years: '2010 – 2011' },
  { name: 'Chief O.O. Onyemachi', years: 'From 2011', note: 'The source lists this entry as “2011 – Date” without an end year.' },
]
