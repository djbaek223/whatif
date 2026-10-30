// Real American headlines by month for an American life, the same way lib/news.ts keeps Korea's.
// Facts only; the narrator adds texture. After the last real one, imagined headlines (tagged 가상) take over.
import type { Effect } from "../../lib/events";
import type { NewsCat, NewsItem } from "../../lib/news";
import type { LifeState } from "../../lib/types";
import { employee, ownsBusiness } from "../../lib/work";
import { T } from "../../lib/i18n";

const mi = (date: string) => {
  const [y, m] = date.split("-").map(Number);
  return y * 12 + (m - 1);
};
type Opts = { big?: boolean; impact?: NewsItem["impact"] };
const n = (date: string, cat: NewsCat, text: string, opts: Opts = {}): NewsItem => ({ mi: mi(date), cat, text, ...opts });

const ageOf = (s: LifeState) => {
  const [y, m] = s.profile.birthDate.split("-").map(Number);
  return Math.floor((s.mi - (y * 12 + (m - 1))) / 12);
};
const adult = (s: LifeState, min = 18) => ageOf(s) >= min;

// ── Impacts of the biggest shocks ─────────────────────────
const oilShock = (s: LifeState): Effect | null =>
  adult(s) ? { text: T("Gas lines wrapped around the block, and every fill-up hurt."), stats: { happiness: -2 }, wealth: -40 } : null;

const recession = (s: LifeState): Effect | null => {
  if (!adult(s, 20)) return { text: T("The grown-ups talked about money in low voices at the kitchen table."), stats: { happiness: -2 } };
  if (ownsBusiness(s.flags)) return { text: T("Customers stopped coming in. Keeping the doors open was a struggle."), stats: { happiness: -5 }, incomePct: 0.85 };
  if (employee(s.flags) && !/government|teacher|mail|postal/i.test(s.flags.job))
    return {
      text: T("Layoffs came to your workplace too."),
      risk: {
        chance: () => 0.8,
        success: { text: T("You kept your job, though raises were frozen."), stats: { happiness: -4 } },
        failure: { text: T("You got the pink slip and were out of work overnight."), stats: { happiness: -12, health: -2 }, flags: { employed: false, job: "" }, income: 0 },
      },
    };
  return { text: T("Prices kept rising and savings went less far."), stats: { happiness: -3 }, wealthPct: -0.05 };
};

const crash = (s: LifeState): Effect | null =>
  adult(s, 22) && s.wealth > 2000 ? { text: T("The 401(k) statement was hard to look at."), stats: { happiness: -3 }, wealthPct: -0.1 } : null;

const pandemic = (s: LifeState): Effect | null => {
  if (!adult(s)) return { text: T("School moved to a laptop screen. You barely saw your friends."), stats: { relationships: -4, happiness: -2 } };
  if (ownsBusiness(s.flags)) return { text: T("Business dried up almost overnight. Just staying open was the job."), stats: { happiness: -6 }, incomePct: 0.8 };
  return { text: T("Masks, six feet apart, and a life lived mostly at home began."), stats: { relationships: -4, happiness: -3 } };
};

const assetBoom = (s: LifeState): Effect | null => {
  if (!adult(s, 25)) return null;
  if (s.flags.homeOwner) return { text: T("Your house was suddenly worth a lot more."), wealthPct: 0.12, stats: { happiness: 2 } };
  return { text: T("Rents and home prices ran away from you. Bidding wars were everywhere."), stats: { happiness: -3 } };
};

const rateShock = (s: LifeState): Effect | null =>
  adult(s, 22) ? { text: T("Groceries, rent and gas all cost noticeably more."), stats: { happiness: -2 }, wealth: -150 } : null;

const cheer = (text: () => string, happiness = 3) => () => ({ text: text(), stats: { happiness } });
const grief = (text: () => string, happiness = -3) => () => ({ text: text(), stats: { happiness } });

export const US_NEWS: NewsItem[] = [
  // ── 1960s ──
  n("1960-09", "정치", "Kennedy and Nixon faced off in the first televised presidential debate."),
  n("1960-11", "정치", "John F. Kennedy was elected president.", { big: true }),
  n("1961-04", "세계", "The Bay of Pigs invasion of Cuba failed."),
  n("1961-05", "과학", "Alan Shepard became the first American in space."),
  n("1962-02", "과학", "John Glenn orbited the Earth."),
  n("1962-10", "세계", "The Cuban Missile Crisis brought the world to the edge of nuclear war.", { big: true }),
  n("1963-08", "사회", "At the March on Washington, Martin Luther King Jr. said 'I have a dream.'", { big: true }),
  n("1963-11", "정치", "President Kennedy was assassinated in Dallas.", { big: true, impact: grief(() => T("The whole country stopped and watched the TV in shock."), -4) }),
  n("1964-02", "연예", "The Beatles played The Ed Sullivan Show, and Beatlemania hit America.", { big: true }),
  n("1964-07", "사회", "President Johnson signed the Civil Rights Act."),
  n("1965-03", "세계", "The first US combat troops landed in Vietnam."),
  n("1965-07", "사회", "Medicare and Medicaid were signed into law."),
  n("1965-08", "사회", "The Voting Rights Act became law."),
  n("1967-01", "스포츠", "The first Super Bowl was played; the Packers beat the Chiefs."),
  n("1967-07", "사회", "Riots broke out in Detroit and Newark during the 'long, hot summer.'"),
  n("1968-01", "세계", "The Tet Offensive shook confidence in the war in Vietnam."),
  n("1968-04", "사회", "Martin Luther King Jr. was assassinated in Memphis.", { big: true, impact: grief(() => T("Cities burned, and the country grieved."), -4) }),
  n("1968-06", "정치", "Robert F. Kennedy was shot in Los Angeles."),
  n("1968-11", "정치", "Richard Nixon was elected president."),
  n("1969-07", "과학", "Apollo 11 landed on the Moon. Neil Armstrong took one small step.", { big: true, impact: cheer(() => T("Everyone crowded around a TV to watch the Moon landing."), 4) }),
  n("1969-08", "연예", "Half a million people gathered at Woodstock."),
  // ── 1970s ──
  n("1970-04", "사회", "The first Earth Day was held."),
  n("1970-05", "사회", "National Guard troops shot four students at Kent State."),
  n("1971-06", "정치", "The New York Times published the Pentagon Papers."),
  n("1971-07", "정치", "The 26th Amendment lowered the voting age to 18."),
  n("1972-06", "정치", "Five men were arrested breaking into the Watergate complex."),
  n("1972-11", "정치", "Nixon won reelection in a landslide."),
  n("1973-01", "사회", "The Supreme Court decided Roe v. Wade. A Vietnam peace deal was signed the same month.", { big: true }),
  n("1973-10", "경제", "The Arab oil embargo began, and gas prices soared.", { big: true, impact: oilShock }),
  n("1974-04", "스포츠", "Hank Aaron hit his 715th home run, breaking Babe Ruth's record."),
  n("1974-08", "정치", "Richard Nixon resigned over Watergate; Gerald Ford became president.", { big: true }),
  n("1975-04", "세계", "Saigon fell, and the Vietnam War ended."),
  n("1975-06", "연예", "'Jaws' became the first summer blockbuster."),
  n("1976-04", "과학", "Steve Jobs and Steve Wozniak started Apple Computer in a garage."),
  n("1976-07", "사회", "The country celebrated its Bicentennial with fireworks everywhere.", { big: true, impact: cheer(() => T("Fireworks lit up the Fourth of July for the 200th birthday."), 2) }),
  n("1976-11", "정치", "Jimmy Carter was elected president."),
  n("1977-05", "연예", "'Star Wars' opened, and lines wrapped around theaters."),
  n("1977-07", "사회", "A blackout plunged New York City into darkness."),
  n("1977-08", "연예", "Elvis Presley died at Graceland."),
  n("1978-09", "세계", "Egypt and Israel reached the Camp David Accords."),
  n("1979-03", "과학", "A partial meltdown happened at the Three Mile Island nuclear plant."),
  n("1979-06", "경제", "A second oil shock brought back gas lines and odd-even rationing.", { impact: oilShock }),
  n("1979-11", "세계", "Iranian students seized the US embassy and took Americans hostage.", { big: true }),
  // ── 1980s ──
  n("1980-02", "스포츠", "'Do you believe in miracles?' The US hockey team beat the Soviets at Lake Placid.", { big: true, impact: cheer(() => T("You screamed at the TV when the hockey team beat the Soviets."), 3) }),
  n("1980-05", "과학", "Mount St. Helens erupted in Washington State."),
  n("1980-06", "연예", "CNN launched as the first 24-hour news channel."),
  n("1980-11", "정치", "Ronald Reagan was elected president."),
  n("1980-12", "연예", "John Lennon was shot outside his New York apartment."),
  n("1981-01", "세계", "The Iran hostages were freed minutes after Reagan's inauguration."),
  n("1981-03", "정치", "President Reagan survived an assassination attempt."),
  n("1981-04", "과학", "The first space shuttle, Columbia, launched."),
  n("1981-08", "연예", "MTV went on the air with 'Video Killed the Radio Star.'"),
  n("1982-01", "경제", "Unemployment headed toward 10% in the worst recession since the 1930s.", { big: true, impact: recession }),
  n("1982-11", "사회", "The Vietnam Veterans Memorial was dedicated in Washington."),
  n("1983-06", "과학", "Sally Ride became the first American woman in space."),
  n("1983-10", "세계", "A truck bomb killed 241 US service members in Beirut."),
  n("1984-01", "과학", "Apple's '1984' ad aired, and the Macintosh went on sale."),
  n("1984-07", "스포츠", "The Los Angeles Olympics opened; Carl Lewis won four golds.", { big: true }),
  n("1984-11", "정치", "Reagan won reelection, carrying 49 states."),
  n("1985-07", "연예", "Live Aid concerts in Philadelphia and London raised money for famine relief."),
  n("1986-01", "과학", "The space shuttle Challenger broke apart after launch.", { big: true, impact: grief(() => T("Kids watching in classrooms saw the Challenger explode."), -3) }),
  n("1986-04", "세계", "The Chernobyl nuclear disaster happened in the Soviet Union."),
  n("1986-11", "정치", "The Iran-Contra affair came to light."),
  n("1987-06", "세계", "In Berlin, Reagan said, 'Mr. Gorbachev, tear down this wall!'"),
  n("1987-10", "경제", "On Black Monday the Dow fell 22% in a single day.", { big: true, impact: crash }),
  n("1988-11", "정치", "George H. W. Bush was elected president."),
  n("1989-03", "사회", "The Exxon Valdez spilled oil into Alaska's Prince William Sound."),
  n("1989-10", "사회", "An earthquake hit San Francisco during the World Series."),
  n("1989-11", "세계", "The Berlin Wall fell.", { big: true }),
  n("1989-12", "연예", "'The Simpsons' premiered as a weekly series."),
  // ── 1990s ──
  n("1990-07", "사회", "The Americans with Disabilities Act was signed."),
  n("1990-08", "세계", "Iraq invaded Kuwait."),
  n("1991-01", "세계", "Operation Desert Storm began, live on CNN.", { big: true }),
  n("1991-08", "과학", "The World Wide Web went public."),
  n("1991-12", "세계", "The Soviet Union dissolved, and the Cold War ended.", { big: true }),
  n("1992-04", "사회", "Riots broke out in Los Angeles after the Rodney King verdict."),
  n("1992-08", "사회", "Hurricane Andrew devastated South Florida."),
  n("1992-11", "정치", "Bill Clinton was elected president."),
  n("1993-02", "사회", "A bomb exploded under the World Trade Center."),
  n("1993-06", "연예", "'Jurassic Park' roared into theaters."),
  n("1994-01", "경제", "NAFTA took effect."),
  n("1994-06", "사회", "Millions watched O. J. Simpson's white Bronco chase. The US hosted the World Cup.", { big: true }),
  n("1994-08", "스포츠", "A players' strike cancelled the rest of the baseball season and the World Series."),
  n("1995-04", "사회", "The Oklahoma City bombing killed 168 people.", { big: true, impact: grief(() => T("The pictures from Oklahoma City were hard to look at."), -3) }),
  n("1995-08", "경제", "Windows 95 launched to midnight lines. Netscape's IPO kicked off the dot-com era."),
  n("1995-10", "사회", "O. J. Simpson was acquitted of murder."),
  n("1996-07", "스포츠", "The Atlanta Olympics opened; Kerri Strug vaulted on an injured ankle."),
  n("1996-11", "정치", "Clinton won a second term."),
  n("1997-04", "스포츠", "Tiger Woods won the Masters at 21."),
  n("1997-08", "세계", "Princess Diana died in a car crash in Paris."),
  n("1997-12", "연예", "'Titanic' opened and became the biggest movie ever."),
  n("1998-09", "과학", "Google was founded. Mark McGwire broke the home run record."),
  n("1998-12", "정치", "The House impeached President Clinton."),
  n("1999-04", "사회", "Two students killed 13 people at Columbine High School.", { big: true }),
  n("1999-07", "스포츠", "Brandi Chastain's penalty kick won the Women's World Cup."),
  n("1999-12", "과학", "Everyone stocked up on water and batteries for the Y2K bug."),
  // ── 2000s ──
  n("2000-03", "경제", "The Nasdaq peaked, then the dot-com bubble burst.", { big: true }),
  n("2000-12", "정치", "After the Florida recount and Bush v. Gore, George W. Bush won the presidency."),
  n("2001-03", "경제", "The economy slid into recession as tech companies folded.", { impact: recession }),
  n("2001-09", "사회", "Terrorists attacked the World Trade Center and the Pentagon. Nearly 3,000 people died.", { big: true, impact: grief(() => T("Everyone remembered exactly where they were that morning."), -5) }),
  n("2001-10", "세계", "The war in Afghanistan began. Apple introduced the iPod."),
  n("2002-01", "경제", "Enron's collapse wiped out employees' retirement savings."),
  n("2003-02", "과학", "The space shuttle Columbia broke apart on reentry."),
  n("2003-03", "세계", "The US invaded Iraq.", { big: true }),
  n("2003-08", "사회", "A massive blackout hit the Northeast and Canada."),
  n("2004-02", "과학", "Facebook launched in a Harvard dorm room."),
  n("2004-05", "사회", "Massachusetts became the first state to allow same-sex marriage."),
  n("2004-10", "스포츠", "The Red Sox won the World Series, ending an 86-year drought."),
  n("2004-11", "정치", "George W. Bush won reelection."),
  n("2005-02", "과학", "YouTube was founded."),
  n("2005-08", "사회", "Hurricane Katrina flooded New Orleans.", { big: true, impact: grief(() => T("The images from New Orleans were hard to forget."), -3) }),
  n("2006-07", "과학", "Twitter launched."),
  n("2007-01", "과학", "Steve Jobs unveiled the iPhone.", { big: true }),
  n("2007-04", "사회", "A gunman killed 32 people at Virginia Tech."),
  n("2007-08", "경제", "The subprime mortgage crisis broke out."),
  n("2008-08", "스포츠", "Michael Phelps won eight gold medals at the Beijing Olympics."),
  n("2008-09", "경제", "Lehman Brothers collapsed, and the financial crisis began.", { big: true, impact: crash }),
  n("2008-11", "정치", "Barack Obama was elected the first Black president.", { big: true }),
  n("2009-01", "사회", "'Sully' landed a jet on the Hudson River, and everyone survived."),
  n("2009-06", "연예", "Michael Jackson died."),
  n("2009-10", "경제", "Unemployment hit 10%.", { impact: recession }),
  // ── 2010s ──
  n("2010-03", "정치", "The Affordable Care Act was signed into law."),
  n("2010-04", "과학", "The Deepwater Horizon rig exploded, spilling oil into the Gulf of Mexico."),
  n("2011-05", "세계", "US forces killed Osama bin Laden.", { big: true }),
  n("2011-08", "경제", "The US lost its AAA credit rating."),
  n("2011-09", "사회", "Occupy Wall Street protests began in New York."),
  n("2011-10", "과학", "Steve Jobs died."),
  n("2011-12", "세계", "The last US troops left Iraq."),
  n("2012-07", "사회", "A gunman opened fire at a movie theater in Aurora, Colorado."),
  n("2012-10", "사회", "Hurricane Sandy flooded New York and New Jersey."),
  n("2012-11", "정치", "Obama won a second term."),
  n("2012-12", "사회", "Twenty children and six adults were killed at Sandy Hook Elementary.", { big: true, impact: grief(() => T("Parents hugged their kids a little longer that week."), -4) }),
  n("2013-04", "사회", "Bombs exploded at the finish line of the Boston Marathon."),
  n("2013-06", "정치", "Edward Snowden revealed NSA mass surveillance."),
  n("2014-08", "사회", "Protests erupted in Ferguson, Missouri. The Ice Bucket Challenge went viral."),
  n("2015-06", "사회", "The Supreme Court legalized same-sex marriage nationwide.", { big: true }),
  n("2015-08", "연예", "'Hamilton' opened on Broadway."),
  n("2016-06", "사회", "A gunman killed 49 people at the Pulse nightclub in Orlando."),
  n("2016-07", "연예", "Pokémon Go sent everyone outside staring at their phones."),
  n("2016-11", "정치", "Donald Trump won the presidential election. The Cubs won the World Series.", { big: true }),
  n("2017-01", "사회", "Millions joined the Women's March the day after the inauguration."),
  n("2017-08", "과학", "A total solar eclipse crossed the country coast to coast.", { impact: cheer(() => T("You wore paper glasses and watched the eclipse."), 2) }),
  n("2017-10", "사회", "A gunman killed 60 people at a concert in Las Vegas. #MeToo spread."),
  n("2017-12", "경제", "Bitcoin neared $20,000 at the height of a crypto craze."),
  n("2018-02", "사회", "A shooting at Parkland, Florida, led students to march for gun control."),
  n("2018-11", "사회", "The Camp Fire destroyed the town of Paradise, California."),
  n("2019-04", "연예", "'Avengers: Endgame' broke box office records."),
  n("2019-12", "정치", "The House impeached President Trump."),
  // ── 2020s ──
  n("2020-03", "사회", "The WHO declared a pandemic. Schools closed and states issued stay-at-home orders.", { big: true, impact: pandemic }),
  n("2020-04", "경제", "Unemployment jumped to nearly 15%. Stimulus checks went out.", { big: true }),
  n("2020-05", "사회", "George Floyd was killed by police in Minneapolis, and protests spread nationwide.", { big: true }),
  n("2020-11", "정치", "Joe Biden won the presidential election."),
  n("2020-12", "과학", "The first COVID-19 vaccines were given."),
  n("2021-01", "정치", "A mob stormed the US Capitol on January 6.", { big: true }),
  n("2021-04", "사회", "Vaccines opened to all adults; people lined up at pharmacies and stadiums."),
  n("2021-06", "경제", "Home prices hit record highs in bidding wars across the country.", { big: true, impact: assetBoom }),
  n("2021-08", "세계", "The last US troops left Afghanistan."),
  n("2022-02", "세계", "Russia invaded Ukraine."),
  n("2022-06", "경제", "Inflation hit 9%, the highest in four decades, and the Fed raised rates sharply.", { big: true, impact: rateShock }),
  n("2022-06", "사회", "The Supreme Court overturned Roe v. Wade."),
  n("2022-11", "과학", "ChatGPT was released, and AI became dinner-table talk."),
  n("2023-03", "경제", "Silicon Valley Bank collapsed."),
  n("2023-07", "연예", "'Barbenheimer' packed theaters. Writers and actors went on strike."),
  n("2023-08", "연예", "Taylor Swift's Eras Tour shook stadiums; a fire destroyed Lahaina on Maui."),
  n("2024-04", "과학", "A total solar eclipse crossed from Texas to Maine."),
  n("2024-07", "스포츠", "The Paris Olympics opened; Simone Biles won all-around gold."),
  n("2024-11", "정치", "Donald Trump won the presidential election again.", { big: true }),
  n("2025-01", "사회", "Wildfires burned through Los Angeles, destroying thousands of homes."),
  n("2025-04", "경제", "Sweeping new tariffs rattled the stock market."),
  n("2025-05", "세계", "Robert Prevost of Chicago became Pope Leo XIV, the first American pope."),
  n("2026-02", "스포츠", "The Milan Cortina Winter Olympics were held."),
  n("2026-06", "스포츠", "The World Cup opened in the US, Canada and Mexico.", { big: true, impact: cheer(() => T("World Cup fever filled the stadiums and sports bars."), 2) }),
  n("2026-07", "사회", "The country celebrated its 250th birthday.", { big: true, impact: cheer(() => T("Fireworks lit up the sky for the semiquincentennial."), 2) }),
  // ── Already scheduled ──
  n("2028-07", "스포츠", "The Los Angeles Olympics opened."),
  n("2028-11", "정치", "Americans voted in a presidential election."),
  n("2030-06", "스포츠", "The centennial World Cup kicked off in Spain, Portugal and Morocco."),
  n("2032-07", "스포츠", "The Brisbane Olympics opened."),
  n("2034-02", "스포츠", "The Salt Lake City Winter Olympics opened."),
];

export const US_LAST_REAL_NEWS_MI = mi("2026-07");

/** Imagined headlines after the last real one, clearly tagged as imagined. */
export const US_FUTURE: { from: number; cat: NewsCat; text: string }[] = [
  { from: 2027, cat: "과학", text: "A survey found more than half of offices let AI assistants write their meeting notes and reports." },
  { from: 2027, cat: "경제", text: "More companies tried a four-day work week." },
  { from: 2027, cat: "연예", text: "An AI-generated singer cracked the Billboard Hot 100, and the debate began." },
  { from: 2028, cat: "과학", text: "Driverless robotaxis became ordinary in a dozen big cities." },
  { from: 2028, cat: "사회", text: "Another summer broke heat records across the Southwest." },
  { from: 2029, cat: "과학", text: "Air taxis began test flights between airports and downtowns." },
  { from: 2029, cat: "경제", text: "Congress argued over jobs lost to AI and the new ones it created." },
  { from: 2030, cat: "사회", text: "Every baby boomer was now 65 or older." },
  { from: 2030, cat: "과학", text: "Astronauts walked on the Moon again for the first time since 1972." },
  { from: 2031, cat: "경제", text: "Cashless stores spread from big chains to corner shops." },
  { from: 2032, cat: "과학", text: "Personalized cancer vaccines showed strong results in trials." },
  { from: 2033, cat: "스포츠", text: "Robot umpires calling balls and strikes became normal in the majors." },
  { from: 2033, cat: "과학", text: "Humanoid robots started working in warehouses and nursing homes." },
  { from: 2035, cat: "과학", text: "Home robots that could fold laundry went on sale." },
  { from: 2035, cat: "경제", text: "The full Social Security retirement age debate came back to Washington." },
  { from: 2037, cat: "과학", text: "A drug that slows Alzheimer's became covered by Medicare." },
  { from: 2038, cat: "연예", text: "Bands from the 2000s filled stadiums on reunion tours." },
  { from: 2040, cat: "과학", text: "A fusion plant delivered power to the grid for the first time." },
  { from: 2040, cat: "사회", text: "Life expectancy rose again, and living to 100 no longer made the local news." },
  { from: 2042, cat: "과학", text: "The first crewed mission to Mars launched, and the whole world watched." },
  { from: 2045, cat: "과학", text: "AI doctors handled first visits at most neighborhood clinics." },
  { from: 2050, cat: "세계", text: "A UN report said world population was close to its peak." },
  { from: 2050, cat: "과학", text: "The net-zero target year arrived, with a long way still to go." },
  { from: 2055, cat: "과학", text: "Treatments that slow aging began at a few hospitals." },
  { from: 2065, cat: "과학", text: "Watching a live feed from a Moon base, your grandchild said they wanted to be an astronaut." },
  { from: 2070, cat: "사회", text: "The last pay phone in the country went to a museum." },
];

/** Short notes on each era, for the narrator. */
export const US_ERA: Record<number, string> = {
  1960: "Suburbs, station wagons and the space race.",
  1964: "Beatlemania and the civil rights movement.",
  1968: "Vietnam protests, assassinations and a country divided.",
  1969: "The Moon landing and Woodstock.",
  1973: "Watergate and the oil embargo's gas lines.",
  1977: "Disco, 'Star Wars' and stagflation.",
  1980: "The Miracle on Ice and the start of the Reagan years.",
  1982: "A deep recession; MTV and the Walkman.",
  1984: "The Los Angeles Olympics and the first Macintosh.",
  1986: "The Challenger disaster.",
  1987: "Black Monday on Wall Street.",
  1989: "The Berlin Wall fell.",
  1991: "Desert Storm on CNN; the Soviet Union ended.",
  1994: "The World Cup in the US and the O. J. Simpson case.",
  1995: "Windows 95, AOL and the early web.",
  1999: "Y2K worries and the dot-com boom.",
  2001: "The September 11 attacks changed everything.",
  2003: "The Iraq War began.",
  2005: "Hurricane Katrina.",
  2007: "The iPhone and the subprime mortgage crisis.",
  2008: "The financial crisis and Obama's election.",
  2010: "A slow recovery; Facebook and smartphones everywhere.",
  2015: "Same-sex marriage became legal nationwide.",
  2016: "A bitterly divided election.",
  2020: "The COVID-19 pandemic, remote work and protests for racial justice.",
  2021: "Vaccines, stimulus checks and a hot housing market.",
  2022: "Inflation and rising interest rates.",
  2023: "Generative AI spread fast.",
};
