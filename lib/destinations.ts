/**
 * Trip destinations. A trip group can pick one to get a themed header, local currency,
 * travel facts, lesser-known places nearby, and a packing checklist.
 *
 * Rules that change (permits, fees, visas) are phrased as "check before you go" on purpose.
 * Contributions welcome: add a place by appending to DESTINATIONS.
 */

export type Vibe = "mountains" | "beach" | "heritage" | "spiritual" | "nature" | "desert" | "city" | "islands";

export type Destination = {
  id: string;
  name: string;
  region: string;
  country: "India" | "Abroad";
  vibe: Vibe;
  emoji: string;
  /** Two colours for the group header gradient. */
  colors: [string, string];
  currency: string;
  bestMonths: string;
  tagline: string;
  facts: string[];
  hiddenGems: { name: string; note: string }[];
  tips: string[];
};

export const DESTINATIONS: Destination[] = [
  {
    id: "sikkim",
    name: "Sikkim",
    region: "Northeast",
    country: "India",
    vibe: "mountains",
    emoji: "🏔️",
    colors: ["#1f4e5f", "#6aa3a1"],
    currency: "INR",
    bestMonths: "Mar–May, Oct–Dec",
    tagline: "Monasteries, prayer flags and Kangchenjunga at sunrise.",
    facts: [
      "Sikkim was declared India's first fully organic state in 2016.",
      "Kangchenjunga, the third-highest mountain on Earth, is worshipped as a guardian deity here.",
      "Khangchendzonga National Park is India's first UNESCO 'mixed' World Heritage Site, honoured for both nature and culture.",
      "Gurudongmar Lake sits at about 5,400 m and is sacred to Buddhists and Sikhs alike.",
    ],
    hiddenGems: [
      { name: "Zuluk", note: "Old Silk Route village with a road of 30+ hairpin bends." },
      { name: "Yuksom", note: "Sikkim's first capital and the start of the Goecha La trek." },
      { name: "Dzongu", note: "Lepcha reserve with homestays, hot springs and almost no crowds." },
      { name: "Ravangla", note: "Quiet ridge town with the Buddha Park and big mountain views." },
    ],
    tips: [
      "North Sikkim (Lachung, Gurudongmar) needs a permit arranged through a registered operator. Carry ID photocopies and passport photos.",
      "ATMs thin out past Gangtok. Keep cash for the north.",
      "Plastic water bottles are restricted in several areas. Carry a refillable bottle.",
    ],
  },
  {
    id: "goa",
    name: "Goa",
    region: "West coast",
    country: "India",
    vibe: "beach",
    emoji: "🏖️",
    colors: ["#e07a3f", "#f2c14e"],
    currency: "INR",
    bestMonths: "Nov–Feb",
    tagline: "Susegad days, fish thali and a scooter at the door.",
    facts: [
      "Goa is India's smallest state by area.",
      "It was under Portuguese rule until 1961, which is why its old churches, food and architecture feel so different.",
      "The Basilica of Bom Jesus in Old Goa is part of a UNESCO World Heritage Site.",
      "'Susegad', the relaxed Goan way of life, comes from the Portuguese word 'sossegado' (quiet, calm).",
    ],
    hiddenGems: [
      { name: "Divar Island", note: "Ferry ride from Old Goa to sleepy Portuguese-era villages." },
      { name: "Cola Beach", note: "A freshwater lagoon meets the sea in South Goa." },
      { name: "Netravali", note: "Wildlife sanctuary with a 'bubbling lake' and waterfalls." },
      { name: "Chorla Ghat", note: "Misty forests on the Goa–Karnataka border, best in monsoon." },
    ],
    tips: [
      "Rented scooters need a valid driving licence. Helmets are checked.",
      "North Goa is for parties, South Goa for quiet beaches. Split your stay if you want both.",
      "Many beach shacks close from June to September for the monsoon.",
    ],
  },
  {
    id: "ladakh",
    name: "Ladakh",
    region: "Himalaya",
    country: "India",
    vibe: "mountains",
    emoji: "🏍️",
    colors: ["#38598b", "#a2a8d3"],
    currency: "INR",
    bestMonths: "Jun–Sep",
    tagline: "High passes, blue lakes and the ride of a lifetime.",
    facts: [
      "Leh sits at about 3,500 m. Most visitors need a full 48 hours to acclimatise before going higher.",
      "Pangong Tso is a high-altitude lake that stretches from India into Tibet.",
      "Hanle was notified as India's first Dark Sky Reserve in 2022.",
      "The Hemis festival honours Guru Padmasambhava with masked cham dances every summer.",
    ],
    hiddenGems: [
      { name: "Turtuk", note: "Apricot-filled Balti village near the LoC in Nubra." },
      { name: "Hanle", note: "Observatory village with some of India's darkest night skies." },
      { name: "Sham Valley", note: "Gentle village-to-village homestay trail, good for day 2." },
      { name: "Tso Moriri", note: "A quieter, wilder alternative to Pangong." },
    ],
    tips: [
      "Permits for Nubra, Pangong and Tso Moriri are issued online or in Leh. Keep several printed copies.",
      "Only postpaid mobile SIMs from other states tend to work. Check with your network.",
      "Rest on day one. Altitude sickness ruins more Ladakh trips than weather.",
    ],
  },
  {
    id: "spiti",
    name: "Spiti Valley",
    region: "Himachal",
    country: "India",
    vibe: "mountains",
    emoji: "🏜️",
    colors: ["#7b5e57", "#d8b38c"],
    currency: "INR",
    bestMonths: "May–Oct",
    tagline: "A cold desert of monasteries and fossil-strewn villages.",
    facts: [
      "Spiti means 'the middle land', between Tibet and India.",
      "Hikkim has one of the highest post offices in the world. Send yourself a postcard.",
      "Key Monastery is over a thousand years old and still home to young monks.",
      "Langza is known for marine fossils, left from when the region lay under the Tethys Sea.",
    ],
    hiddenGems: [
      { name: "Langza", note: "Fossil village under a giant Buddha statue." },
      { name: "Dhankar", note: "Cliffside monastery and a short hike to a lake." },
      { name: "Mud Village", note: "End of the road in Pin Valley." },
      { name: "Chandratal", note: "Moon-shaped lake, best for a night under the stars." },
    ],
    tips: [
      "Enter via Kinnaur (Shimla side) for gradual acclimatisation. Exit via Manali when the pass is open.",
      "Petrol pumps are few. Fill up at Kaza.",
      "BSNL and Jio work in parts. Plan for long offline stretches.",
    ],
  },
  {
    id: "meghalaya",
    name: "Meghalaya",
    region: "Northeast",
    country: "India",
    vibe: "nature",
    emoji: "🌧️",
    colors: ["#2d6a4f", "#95d5b2"],
    currency: "INR",
    bestMonths: "Oct–Apr",
    tagline: "Living root bridges, clear rivers and clouds you can walk into.",
    facts: [
      "Meghalaya means 'abode of the clouds'.",
      "Mawsynram and Sohra (Cherrapunji) are among the wettest places on Earth.",
      "Khasi communities grow living bridges from the roots of rubber fig trees. Some take decades to form.",
      "Mawlynnong was called the cleanest village in Asia by a travel magazine in 2003.",
    ],
    hiddenGems: [
      { name: "Nongriat", note: "The double-decker root bridge, about 3,500 steps down." },
      { name: "Shnongpdeng", note: "Camp beside the glass-clear Umngot river." },
      { name: "Laitlum Canyons", note: "Edge-of-the-world views near Shillong." },
      { name: "Krang Suri", note: "Turquoise waterfall pool in the Jaintia Hills." },
    ],
    tips: [
      "Hire a local cab for the day. Public transport between viewpoints is rare.",
      "Carry cash; many villages charge small entry and parking fees.",
      "Weather turns fast. Pack a rain jacket in every season.",
    ],
  },
  {
    id: "kerala",
    name: "Kerala",
    region: "South",
    country: "India",
    vibe: "nature",
    emoji: "🛶",
    colors: ["#1b4332", "#52b788"],
    currency: "INR",
    bestMonths: "Sep–Mar",
    tagline: "Backwaters, tea hills and appam with stew.",
    facts: [
      "Kerala has long had the highest literacy rate of any Indian state.",
      "Kettuvallams, the backwater houseboats, were once rice barges.",
      "The Western Ghats running through Kerala are a UNESCO World Heritage Site and a biodiversity hotspot.",
      "The Nehru Trophy snake-boat race on Punnamada Lake draws boats with over 100 rowers each.",
    ],
    hiddenGems: [
      { name: "Vagamon", note: "Pine forests and meadows without Munnar's crowds." },
      { name: "Gavi", note: "Forest eco-tourism zone run with local communities." },
      { name: "Poovar", note: "Where a river, the backwaters and the sea meet." },
      { name: "Kakkadampoyil", note: "Misty hill village in Kozhikode district." },
    ],
    tips: [
      "Book houseboats directly from the jetty or a licensed operator, and agree on meals and hours upfront.",
      "Dress modestly for temples. Some do not allow non-Hindus inside.",
      "Monsoon (Jun–Aug) is cheap and lush, and ideal for Ayurveda.",
    ],
  },
  {
    id: "rajasthan",
    name: "Rajasthan",
    region: "North-west",
    country: "India",
    vibe: "heritage",
    emoji: "🏰",
    colors: ["#9c2c2c", "#e9a03b"],
    currency: "INR",
    bestMonths: "Oct–Mar",
    tagline: "Forts, stepwells, dunes and dal baati churma.",
    facts: [
      "Jaipur was painted pink in 1876 to welcome the Prince of Wales, and the walled city is now a UNESCO site.",
      "Six hill forts of Rajasthan, including Amber, Chittorgarh and Kumbhalgarh, are jointly UNESCO-listed.",
      "Kumbhalgarh's walls run for about 36 km, among the longest continuous walls in the world.",
      "Jaisalmer Fort is a 'living fort': people still live inside its walls.",
    ],
    hiddenGems: [
      { name: "Bundi", note: "Blue lanes, painted palaces and dozens of stepwells." },
      { name: "Kumbhalgarh", note: "Walk the great wall at sunset." },
      { name: "Khimsar", note: "Dunes and a village safari without Sam's crowds." },
      { name: "Chand Baori, Abhaneri", note: "A 13-storey geometric stepwell." },
    ],
    tips: [
      "Afternoons are hot even in winter. Do forts early in the morning.",
      "Indian visitors get much cheaper monument tickets. Carry ID.",
      "Agree on camel and jeep safari prices before you climb on.",
    ],
  },
  {
    id: "himachal",
    name: "Manali & Kasol",
    region: "Himachal",
    country: "India",
    vibe: "mountains",
    emoji: "🌲",
    colors: ["#344e41", "#a3b18a"],
    currency: "INR",
    bestMonths: "Mar–Jun, Sep–Dec",
    tagline: "Cafés, cedar forests and snow at the Atal Tunnel.",
    facts: [
      "The Atal Tunnel, about 9 km long, is among the world's longest highway tunnels above 10,000 ft.",
      "Malana has its own ancient village council and customs. Visitors are asked not to touch walls or people.",
      "Manikaran has hot springs where gurudwara langar rice is cooked in the natural heat.",
    ],
    hiddenGems: [
      { name: "Tirthan Valley", note: "Trout streams and the Great Himalayan National Park." },
      { name: "Jibhi", note: "Wooden homestays, a waterfall and Jalori Pass." },
      { name: "Barot", note: "Reservoir village with a vintage haulage trolley." },
      { name: "Chitkul", note: "One of the last villages before the Tibet border." },
    ],
    tips: [
      "Rohtang Pass needs an online permit for vehicles, with daily caps.",
      "Volvo buses from Delhi run overnight. Book weekend seats early.",
      "Weekends and long holidays jam the Manali roads. Travel midweek if you can.",
    ],
  },
  {
    id: "uttarakhand",
    name: "Rishikesh & Uttarakhand",
    region: "Himalaya",
    country: "India",
    vibe: "spiritual",
    emoji: "🧘",
    colors: ["#1d3557", "#a8dadc"],
    currency: "INR",
    bestMonths: "Sep–Jun",
    tagline: "River rafting by day, Ganga aarti by evening.",
    facts: [
      "Rishikesh is known as the yoga capital of the world. The Beatles stayed at an ashram here in 1968.",
      "Tungnath, near Chopta, is the highest Shiva temple in the world.",
      "The Valley of Flowers and Nanda Devi National Parks are a joint UNESCO World Heritage Site.",
    ],
    hiddenGems: [
      { name: "Chopta", note: "'Mini Switzerland' and the trek to Tungnath and Chandrashila." },
      { name: "Munsiyari", note: "Panchachuli peaks right outside your window." },
      { name: "Kanatal", note: "Apple orchards and quiet ridges near Mussoorie." },
      { name: "Chakrata", note: "Cantonment town with forests and Tiger Falls." },
    ],
    tips: [
      "Rafting season usually pauses in monsoon (Jul–Aug).",
      "Rishikesh and Haridwar are vegetarian and alcohol-free zones.",
      "Char Dham routes need online registration in season.",
    ],
  },
  {
    id: "andaman",
    name: "Andaman Islands",
    region: "Bay of Bengal",
    country: "India",
    vibe: "islands",
    emoji: "🐠",
    colors: ["#0077b6", "#90e0ef"],
    currency: "INR",
    bestMonths: "Oct–May",
    tagline: "Turquoise water, coral and the best scuba in India.",
    facts: [
      "Havelock and Neil islands were renamed Swaraj Dweep and Shaheed Dweep in 2018.",
      "The Cellular Jail in Port Blair (Kala Pani) is a national memorial to freedom fighters.",
      "North Sentinel Island is completely off-limits to protect the Sentinelese people.",
    ],
    hiddenGems: [
      { name: "Long Island", note: "Lalaji Bay beach, reachable only by boat or a jungle trek." },
      { name: "Chidiya Tapu", note: "Sunset point and bird-watching near Port Blair." },
      { name: "Baratang", note: "Limestone caves and mud volcanoes." },
      { name: "Laxmanpur, Neil", note: "Natural rock bridge at low tide." },
    ],
    tips: [
      "Book government ferries early. Private catamarans sell out on peak dates.",
      "Mobile data is slow. Download maps and tickets offline.",
      "Carry cash. Card machines on smaller islands are unreliable.",
    ],
  },
  {
    id: "hampi",
    name: "Hampi",
    region: "Karnataka",
    country: "India",
    vibe: "heritage",
    emoji: "🪨",
    colors: ["#bc6c25", "#dda15e"],
    currency: "INR",
    bestMonths: "Oct–Feb",
    tagline: "A lost empire among giant boulders.",
    facts: [
      "Hampi was the capital of the Vijayanagara Empire, among the richest cities in the world in the 1500s.",
      "The Group of Monuments at Hampi is a UNESCO World Heritage Site.",
      "The stone chariot at Vittala Temple appears on the ₹50 note.",
      "The musical pillars of Vittala Temple ring with different notes when tapped. Today, tapping is not allowed.",
    ],
    hiddenGems: [
      { name: "Anegundi", note: "Older-than-Hampi village across the river, by coracle." },
      { name: "Sanapur Lake", note: "Coracle rides and cliff views at sunset." },
      { name: "Matanga Hill", note: "The sunrise climb with the whole ruin field below." },
    ],
    tips: [
      "Rent a bicycle or an electric buggy. The site spans about 25 sq km.",
      "Carry water and a hat. There is little shade between temples.",
    ],
  },
  {
    id: "varanasi",
    name: "Varanasi",
    region: "Uttar Pradesh",
    country: "India",
    vibe: "spiritual",
    emoji: "🪔",
    colors: ["#6a040f", "#f48c06"],
    currency: "INR",
    bestMonths: "Oct–Mar",
    tagline: "Ghats, aarti and kachori-jalebi at dawn.",
    facts: [
      "Varanasi is often called one of the oldest continuously inhabited cities in the world.",
      "The evening Ganga aarti at Dashashwamedh Ghat is performed every single day.",
      "Sarnath, 10 km away, is where the Buddha gave his first sermon.",
      "Banarasi silk sarees have a Geographical Indication (GI) tag.",
    ],
    hiddenGems: [
      { name: "Sarnath", note: "Dhamek Stupa and a calm museum, half a day." },
      { name: "Ramnagar Fort", note: "Across the river, with a vintage car and arms museum." },
      { name: "Assi Ghat at sunrise", note: "Subah-e-Banaras music and yoga." },
    ],
    tips: [
      "Take a boat at sunrise and again at aarti. They're completely different views.",
      "The old city lanes are a maze. Save your stay on offline maps.",
    ],
  },
  {
    id: "coorg",
    name: "Coorg",
    region: "Karnataka",
    country: "India",
    vibe: "nature",
    emoji: "☕",
    colors: ["#40531b", "#a7c957"],
    currency: "INR",
    bestMonths: "Oct–Mar",
    tagline: "Coffee estates, mist and pandi curry.",
    facts: [
      "Kodagu (Coorg) is one of India's largest coffee-growing regions.",
      "The river Kaveri rises at Talakaveri in Coorg.",
      "Bylakuppe nearby has one of the largest Tibetan settlements outside Tibet.",
    ],
    hiddenGems: [
      { name: "Mandalpatti", note: "Jeep ride up to sweeping grassland views." },
      { name: "Chelavara Falls", note: "Turtle-shaped rock pool and a falls few tourists find." },
      { name: "Bylakuppe", note: "The Golden Temple and momos in a Tibetan town." },
    ],
    tips: [
      "Stay on a working coffee estate. Many offer plantation walks.",
      "Leeches come out in the monsoon. Carry salt and long socks.",
    ],
  },
  {
    id: "pondicherry",
    name: "Pondicherry",
    region: "South-east coast",
    country: "India",
    vibe: "beach",
    emoji: "🥐",
    colors: ["#e76f51", "#f4a261"],
    currency: "INR",
    bestMonths: "Oct–Mar",
    tagline: "French lanes, bougainvillea and filter coffee.",
    facts: [
      "Puducherry was a French territory until 1954. Some street signs are still in French.",
      "Auroville, founded in 1968, is an experimental township meant to belong to no one country.",
      "The Matrimandir's golden dome houses a meditation chamber with one of the largest optically perfect glass globes.",
    ],
    hiddenGems: [
      { name: "Paradise Beach", note: "Reached by a short boat ride through backwaters." },
      { name: "Serenity Beach", note: "Surf lessons and weekend markets." },
      { name: "Ousteri Lake", note: "Bird-watching wetland just outside town." },
    ],
    tips: [
      "Rent a cycle for the French Quarter. Parking is a pain.",
      "Matrimandir's inner chamber needs a prior booking.",
    ],
  },
  {
    id: "darjeeling",
    name: "Darjeeling",
    region: "West Bengal hills",
    country: "India",
    vibe: "mountains",
    emoji: "🚂",
    colors: ["#2b2d42", "#8d99ae"],
    currency: "INR",
    bestMonths: "Mar–May, Oct–Dec",
    tagline: "Toy train, tea gardens and Tiger Hill sunrise.",
    facts: [
      "The Darjeeling Himalayan Railway 'toy train' is a UNESCO World Heritage Site.",
      "Darjeeling tea was India's first product to get a Geographical Indication tag, in 2004.",
      "The Batasia Loop lets the toy train spiral around itself to gain height.",
    ],
    hiddenGems: [
      { name: "Lepchajagat", note: "Forest hamlet with Kanchenjunga views and no crowds." },
      { name: "Sittong", note: "Orange orchards in winter." },
      { name: "Mirik", note: "Lake town with tea estates all around." },
    ],
    tips: [
      "Tiger Hill sunrise jeeps leave around 4 am. Book the night before.",
      "Combine with Sikkim. Gangtok is about 4 hours away.",
    ],
  },
  {
    id: "arunachal",
    name: "Arunachal Pradesh",
    region: "Northeast",
    country: "India",
    vibe: "mountains",
    emoji: "🌄",
    colors: ["#3a0ca3", "#4cc9f0"],
    currency: "INR",
    bestMonths: "Oct–Apr",
    tagline: "The land of the dawn-lit mountains.",
    facts: [
      "Dong, in Arunachal, sees India's first sunrise.",
      "Tawang Monastery is the largest monastery in India.",
      "Ziro Valley's Apatani people are known for sustainable rice-fish farming, and Ziro hosts a music festival every September.",
      "Indian visitors from other states need an Inner Line Permit (ILP), available online.",
    ],
    hiddenGems: [
      { name: "Mechuka", note: "Remote valley near the China border with a 400-year-old gompa." },
      { name: "Dirang", note: "Hot springs and apple orchards en route to Tawang." },
      { name: "Sela Pass", note: "A frozen lake at about 4,170 m." },
    ],
    tips: [
      "Get the ILP online before you leave and carry printouts.",
      "Roads are long and landslide-prone. Leave buffer days.",
    ],
  },
  {
    id: "kashmir",
    name: "Kashmir",
    region: "Himalaya",
    country: "India",
    vibe: "mountains",
    emoji: "🛶",
    colors: ["#22577a", "#80ed99"],
    currency: "INR",
    bestMonths: "Apr–Jun (meadows), Dec–Feb (snow)",
    tagline: "Shikaras, chinar trees and kahwa in a houseboat.",
    facts: [
      "The Gulmarg Gondola is among the highest cable cars in the world, reaching about 3,980 m.",
      "Srinagar's Dal Lake has a floating vegetable market at dawn.",
      "Tulip Garden in Srinagar is among Asia's largest and blooms for a few weeks in April.",
    ],
    hiddenGems: [
      { name: "Gurez Valley", note: "Remote valley on the Kishanganga with wooden villages." },
      { name: "Doodhpathri", note: "'Valley of milk' meadows a day trip from Srinagar." },
      { name: "Warwan Valley", note: "One of the region's least-visited trekking valleys." },
    ],
    tips: [
      "Prepaid SIMs from other states don't work in J&K. Postpaid does.",
      "Book Gulmarg Gondola phase 2 tickets online early in winter.",
    ],
  },
  {
    id: "kutch",
    name: "Rann of Kutch",
    region: "Gujarat",
    country: "India",
    vibe: "desert",
    emoji: "🌕",
    colors: ["#5c677d", "#e5e5e5"],
    currency: "INR",
    bestMonths: "Nov–Feb",
    tagline: "A white salt desert under the full moon.",
    facts: [
      "The Great Rann of Kutch is one of the largest salt deserts in the world.",
      "Dholavira, a Harappan city in Kutch, became a UNESCO World Heritage Site in 2021.",
      "Rann Utsav runs through winter with a tent city on the salt flats.",
    ],
    hiddenGems: [
      { name: "Kala Dungar", note: "The highest point in Kutch, with views over the Rann." },
      { name: "Mandvi", note: "Beach town where wooden dhows are still built by hand." },
      { name: "Bhujodi", note: "Weaving village. Buy straight from the artisans." },
    ],
    tips: [
      "Get a permit for the White Rann at Bhirandiyara checkpoint or online.",
      "Plan around a full-moon night.",
    ],
  },
  {
    id: "gokarna",
    name: "Gokarna",
    region: "Karnataka coast",
    country: "India",
    vibe: "beach",
    emoji: "🕉️",
    colors: ["#06d6a0", "#118ab2"],
    currency: "INR",
    bestMonths: "Oct–Mar",
    tagline: "Temple town and a coastal trek between hidden beaches.",
    facts: [
      "Om Beach is named for its shape, which resembles the Om symbol.",
      "Gokarna's Mahabaleshwar Temple is an important Shiva pilgrimage site.",
    ],
    hiddenGems: [
      { name: "Half Moon & Paradise", note: "Beaches reachable only on foot or by boat." },
      { name: "Mirjan Fort", note: "Moss-covered laterite fort, 30 minutes away." },
      { name: "Yana Caves", note: "Black limestone pinnacles in the forest." },
    ],
    tips: ["The beach trek takes 3–4 hours. Start early and carry water.", "Kudle and Om have the most stays."],
  },
  {
    id: "nagaland",
    name: "Nagaland",
    region: "Northeast",
    country: "India",
    vibe: "nature",
    emoji: "🪶",
    colors: ["#7f1d1d", "#f59e0b"],
    currency: "INR",
    bestMonths: "Oct–May (Hornbill: Dec 1–10)",
    tagline: "Hornbill Festival, Dzukou Valley and smoked pork.",
    facts: [
      "The Hornbill Festival is held every year from 1 to 10 December at Kisama.",
      "Nagaland is home to more than 16 major tribes, each with its own language and dress.",
      "Indian visitors from other states need an Inner Line Permit, available online.",
    ],
    hiddenGems: [
      { name: "Dzukou Valley", note: "Rolling green valley, famous for its lilies in summer." },
      { name: "Khonoma", note: "India's first 'green village' and a model of community conservation." },
      { name: "Longwa", note: "A village where the chief's house straddles the India–Myanmar border." },
    ],
    tips: ["Book Kohima stays months ahead for Hornbill.", "Sunday is a rest day. Many shops close."],
  },
  {
    id: "lakshadweep",
    name: "Lakshadweep",
    region: "Arabian Sea",
    country: "India",
    vibe: "islands",
    emoji: "🐢",
    colors: ["#00b4d8", "#caf0f8"],
    currency: "INR",
    bestMonths: "Oct–May",
    tagline: "Coral atolls and lagoons you can see straight through.",
    facts: [
      "Lakshadweep is India's smallest Union Territory, made of 36 islands.",
      "Every visitor, including Indians, needs an entry permit.",
      "It's one of the few places in India to snorkel among sea turtles.",
    ],
    hiddenGems: [
      { name: "Agatti", note: "Airstrip island with a long lagoon." },
      { name: "Bangaram", note: "Tear-drop island ringed by coral." },
    ],
    tips: ["Apply for the entry permit well ahead.", "Alcohol is only available on a few resort islands."],
  },
  {
    id: "odisha",
    name: "Puri & Konark",
    region: "Odisha",
    country: "India",
    vibe: "heritage",
    emoji: "🛕",
    colors: ["#9a031e", "#fb8b24"],
    currency: "INR",
    bestMonths: "Oct–Mar",
    tagline: "Sun temple, Rath Yatra and Chilika's dolphins.",
    facts: [
      "The Konark Sun Temple is designed as a giant chariot with 24 carved wheels that work as sundials.",
      "Chilika is India's largest brackish-water lagoon and home to Irrawaddy dolphins.",
      "Puri's Rath Yatra pulls three giant chariots through the streets each summer.",
    ],
    hiddenGems: [
      { name: "Satapada", note: "Boat out on Chilika to spot dolphins." },
      { name: "Raghurajpur", note: "Heritage crafts village of pattachitra painters." },
      { name: "Daringbadi", note: "'Kashmir of Odisha', with pine hills in the south." },
    ],
    tips: ["Konark looks best at sunrise and in the evening light-and-sound show."],
  },
  {
    id: "ooty",
    name: "Ooty & Nilgiris",
    region: "Tamil Nadu",
    country: "India",
    vibe: "mountains",
    emoji: "🫖",
    colors: ["#2a9d8f", "#e9c46a"],
    currency: "INR",
    bestMonths: "Oct–Jun",
    tagline: "Rack railway, tea slopes and homemade chocolate.",
    facts: [
      "The Nilgiri Mountain Railway is a UNESCO site and India's only rack railway.",
      "The Nilgiri Biosphere was India's first biosphere reserve, set up in 1986.",
      "Neelakurinji, which colours the hills blue, blooms only once every 12 years.",
    ],
    hiddenGems: [
      { name: "Avalanche Lake", note: "Forest lake on a permit-only eco-tour." },
      { name: "Kotagiri", note: "Quieter, older hill station with Catherine Falls." },
    ],
    tips: ["Book the toy train from Mettupalayam weeks ahead on IRCTC."],
  },
  // —— Abroad, popular with Indian travellers ——
  {
    id: "thailand",
    name: "Thailand",
    region: "Southeast Asia",
    country: "Abroad",
    vibe: "beach",
    emoji: "🐘",
    colors: ["#5f0f40", "#fb8b24"],
    currency: "THB",
    bestMonths: "Nov–Mar",
    tagline: "Night markets, island hopping and pad kra pao.",
    facts: [
      "Thailand is the only Southeast Asian country never colonised by a European power.",
      "Bangkok's full ceremonial name is one of the longest place names in the world.",
      "It's polite to stand for the royal anthem before films in Thai cinemas.",
    ],
    hiddenGems: [
      { name: "Koh Lipe", note: "Small island near Malaysia with clear water." },
      { name: "Pai", note: "Mountain town with canyons and hot springs." },
      { name: "Koh Yao Noi", note: "Laid-back island in Phang Nga Bay." },
    ],
    tips: [
      "Visa rules for Indians have changed often. Check the current rule before booking.",
      "Use Grab or Bolt for rides. Agree on tuk-tuk fares before you sit.",
    ],
  },
  {
    id: "bali",
    name: "Bali",
    region: "Indonesia",
    country: "Abroad",
    vibe: "islands",
    emoji: "🌺",
    colors: ["#2d6a4f", "#f4a261"],
    currency: "IDR",
    bestMonths: "Apr–Oct",
    tagline: "Rice terraces, temples and surf.",
    facts: [
      "Bali is the only Hindu-majority province in Indonesia.",
      "On Nyepi, the Balinese day of silence, the whole island shuts down, including the airport.",
      "Bali's subak rice-terrace irrigation system is a UNESCO World Heritage Site.",
    ],
    hiddenGems: [
      { name: "Sidemen", note: "Rice valleys like Ubud, 20 years ago." },
      { name: "Amed", note: "Black-sand coast and shipwreck snorkelling." },
      { name: "Munduk", note: "Waterfalls and cool highlands." },
    ],
    tips: ["A tourist levy is collected on arrival. Check the current amount.", "Rupiah amounts have many zeros. Double-check before you pay."],
  },
  {
    id: "vietnam",
    name: "Vietnam",
    region: "Southeast Asia",
    country: "Abroad",
    vibe: "nature",
    emoji: "🍜",
    colors: ["#c1121f", "#fdf0d5"],
    currency: "VND",
    bestMonths: "Feb–Apr, Aug–Oct",
    tagline: "Limestone bays, pho and egg coffee.",
    facts: [
      "Ha Long Bay has around 1,600 limestone islands and islets.",
      "Son Doong is the largest known cave passage in the world.",
      "Vietnam is one of the world's largest coffee exporters.",
    ],
    hiddenGems: [
      { name: "Ninh Binh", note: "'Ha Long Bay on land', by rowing boat." },
      { name: "Ha Giang Loop", note: "Mountain motorbike loop in the far north." },
      { name: "Phong Nha", note: "Cave country with jungle treks." },
    ],
    tips: ["Indians can apply for an e-visa online.", "Cash in dong is king at street stalls."],
  },
  {
    id: "dubai",
    name: "Dubai",
    region: "UAE",
    country: "Abroad",
    vibe: "city",
    emoji: "🏙️",
    colors: ["#003049", "#fcbf49"],
    currency: "AED",
    bestMonths: "Nov–Mar",
    tagline: "Desert safaris, souks and the tallest tower.",
    facts: [
      "The Burj Khalifa is the tallest building in the world, at about 828 m.",
      "Dubai Metro's Red Line is among the longest driverless metro lines.",
      "The Gold Souk sells gold priced by the day's rate per gram.",
    ],
    hiddenGems: [
      { name: "Al Fahidi", note: "Old wind-tower quarter and an abra ride across the creek." },
      { name: "Hatta", note: "Mountain kayaking about 2 hours away." },
    ],
    tips: ["Get a Nol card for metro and buses.", "Dress modestly in malls and old Dubai."],
  },
  {
    id: "srilanka",
    name: "Sri Lanka",
    region: "South Asia",
    country: "Abroad",
    vibe: "nature",
    emoji: "🚞",
    colors: ["#386641", "#bc4749"],
    currency: "LKR",
    bestMonths: "Dec–Apr (west & south), May–Sep (east)",
    tagline: "The Ella train, Sigiriya and hoppers.",
    facts: [
      "The Kandy–Ella train is often called one of the most scenic rail journeys in the world.",
      "Sigiriya is a 5th-century rock fortress with surviving frescoes.",
      "Sri Lanka is among the world's largest tea exporters.",
    ],
    hiddenGems: [
      { name: "Haputale", note: "Lipton's Seat tea views without Ella's crowds." },
      { name: "Arugam Bay", note: "Surf town on the east coast." },
      { name: "Jaffna", note: "Tamil culture and food in the north." },
    ],
    tips: ["Book train seats in advance online, or queue early for unreserved ones.", "Apply for the ETA online before flying."],
  },
  {
    id: "nepal",
    name: "Nepal",
    region: "South Asia",
    country: "Abroad",
    vibe: "mountains",
    emoji: "⛰️",
    colors: ["#003566", "#ffc300"],
    currency: "NPR",
    bestMonths: "Oct–Nov, Mar–Apr",
    tagline: "Everest views, Pokhara lakes and dal bhat power.",
    facts: [
      "Eight of the world's ten highest peaks, including Everest, are in or on the border of Nepal.",
      "Nepal's flag is the only non-rectangular national flag.",
      "Lumbini, the Buddha's birthplace, is a UNESCO World Heritage Site.",
    ],
    hiddenGems: [
      { name: "Bandipur", note: "Car-free Newari hill town." },
      { name: "Ghandruk", note: "Gurung village with Annapurna views, without a long trek." },
      { name: "Rara Lake", note: "Nepal's largest lake, far in the west." },
    ],
    tips: [
      "Indian citizens don't need a visa. Carry a passport or voter ID.",
      "Smaller Indian notes are widely accepted. Carry NPR for larger payments.",
    ],
  },
  {
    id: "bhutan",
    name: "Bhutan",
    region: "South Asia",
    country: "Abroad",
    vibe: "spiritual",
    emoji: "🐉",
    colors: ["#ff7b00", "#ffd000"],
    currency: "BTN",
    bestMonths: "Mar–May, Sep–Nov",
    tagline: "Tiger's Nest, dzongs and Gross National Happiness.",
    facts: [
      "Bhutan measures progress with Gross National Happiness.",
      "It's considered the world's first carbon-negative country.",
      "The ngultrum is pegged 1:1 to the Indian rupee.",
      "Paro Taktsang (Tiger's Nest) clings to a cliff about 900 m above the valley.",
    ],
    hiddenGems: [
      { name: "Phobjikha Valley", note: "Black-necked cranes winter here." },
      { name: "Haa Valley", note: "Opened to tourists only in 2002." },
      { name: "Bumthang", note: "Bhutan's spiritual heartland of temples." },
    ],
    tips: [
      "Indian visitors pay a per-night Sustainable Development Fee. Check the current rate.",
      "Carry a passport or voter ID for the entry permit.",
    ],
  },
  {
    id: "maldives",
    name: "Maldives",
    region: "Indian Ocean",
    country: "Abroad",
    vibe: "islands",
    emoji: "🏝️",
    colors: ["#0096c7", "#48cae4"],
    currency: "MVR",
    bestMonths: "Nov–Apr",
    tagline: "Overwater villas or budget local islands.",
    facts: [
      "The Maldives is the world's lowest-lying country, averaging about 1.5 m above sea level.",
      "It has roughly 1,190 coral islands in 26 atolls.",
    ],
    hiddenGems: [
      { name: "Maafushi", note: "Local island with guesthouses, a budget base." },
      { name: "Dhigurah", note: "Long sandbank. Whale sharks are seen nearby." },
    ],
    tips: ["Local islands are dry and modest-dress. Resorts are not.", "US dollars are widely accepted at resorts."],
  },
  {
    id: "singapore",
    name: "Singapore",
    region: "Southeast Asia",
    country: "Abroad",
    vibe: "city",
    emoji: "🦁",
    colors: ["#d00000", "#ffba08"],
    currency: "SGD",
    bestMonths: "Feb–Apr",
    tagline: "Hawker centres, gardens and Little India.",
    facts: [
      "Some hawker stalls in Singapore have held a Michelin star.",
      "Hawker culture is on UNESCO's list of intangible cultural heritage.",
      "Tamil is one of Singapore's four official languages.",
    ],
    hiddenGems: [
      { name: "Pulau Ubin", note: "Cycle around the last kampong village." },
      { name: "Southern Ridges", note: "Treetop walkways between parks." },
    ],
    tips: ["Tap any contactless card on MRT and buses.", "Eating or drinking on the MRT is fined."],
  },
];

const byId = new Map(DESTINATIONS.map((d) => [d.id, d]));

export function getDestination(id: string | null | undefined): Destination | null {
  return id ? byId.get(id) ?? null : null;
}

export const VIBES: Record<Vibe, string> = {
  mountains: "Mountains",
  beach: "Beaches",
  heritage: "Heritage",
  spiritual: "Spiritual",
  nature: "Nature",
  desert: "Desert",
  city: "Cities",
  islands: "Islands",
};

const CHECKLISTS: Record<Vibe, string[]> = {
  mountains: ["Warm layers and a windcheater", "Power bank (cold drains batteries)", "Cash for places without UPI or ATMs", "Basic altitude and motion-sickness meds", "Offline maps"],
  beach: ["Sunscreen and sunglasses", "Quick-dry clothes", "Waterproof phone pouch", "Driving licence for scooter rentals", "Mosquito repellent"],
  heritage: ["Comfortable walking shoes", "Hat and water bottle", "ID for Indian-citizen ticket rates", "Modest clothes for temples"],
  spiritual: ["Modest clothes and a scarf", "Slip-on shoes for temples", "Small change for offerings", "Early alarms for sunrise aarti"],
  nature: ["Rain jacket", "Trekking shoes with grip", "Insect repellent", "Dry bag for electronics", "Cash for village entry fees"],
  desert: ["Warm jacket for desert nights", "Scarf against sand and sun", "Lip balm and moisturiser", "Torch for night walks"],
  city: ["Transit card or app", "Universal adapter", "Comfortable shoes", "Forex card or international debit card"],
  islands: ["Reef-safe sunscreen", "Snorkel mask if you have one", "Ferry tickets saved offline", "Cash (cards fail on small islands)", "Seasickness tablets"],
};

export function checklistFor(dest: Destination | null): string[] {
  const base = ["ID card and printouts of permits/tickets", "Split the first booking on SplitnDutch 😉"];
  if (!dest) return base;
  return [...CHECKLISTS[dest.vibe], ...base];
}

/** Deterministic "fact of the day" so the page doesn't flicker between renders. */
export function factOfTheDay(dest: Destination, dayISO: string): string {
  const n = [...dayISO].reduce((s, c) => s + c.charCodeAt(0), 0);
  return dest.facts[n % dest.facts.length];
}

export function tripCountdown(start: string | null, end: string | null, today: string): string | null {
  if (!start) return null;
  const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000;
  const t = day(today);
  const s = day(start);
  const e = end ? day(end) : s;
  if (t < s) {
    const n = s - t;
    return n === 1 ? "Leaving tomorrow" : `${n} days to go`;
  }
  if (t <= e) return `Day ${t - s + 1} of ${e - s + 1}`;
  return "Trip done. Time to settle up";
}
