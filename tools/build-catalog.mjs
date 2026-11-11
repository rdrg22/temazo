// Resuelve la lista de canciones contra la API pública de Deezer y genera ../catalog.js
// Uso: node tools/build-catalog.mjs
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const LISTS = {
  exitos: `
The Weeknd - Blinding Lights
Ed Sheeran - Shape of You
Dua Lipa - Levitating
Harry Styles - As It Was
Miley Cyrus - Flowers
Billie Eilish - bad guy
Olivia Rodrigo - drivers license
Luis Fonsi - Despacito
Mark Ronson - Uptown Funk
Adele - Rolling in the Deep
Pharrell Williams - Happy
Gotye - Somebody That I Used to Know
Carly Rae Jepsen - Call Me Maybe
LMFAO - Party Rock Anthem
Shakira - Waka Waka (This Time for Africa)
The Black Eyed Peas - I Gotta Feeling
Lady Gaga - Poker Face
Rihanna - Umbrella
Beyoncé - Crazy In Love
OutKast - Hey Ya!
Britney Spears - Toxic
Michael Jackson - Billie Jean
Queen - Don't Stop Me Now
ABBA - Dancing Queen
a-ha - Take on Me
Whitney Houston - I Wanna Dance with Somebody
Bee Gees - Stayin' Alive
Toto - Africa
Journey - Don't Stop Believin'
Survivor - Eye of the Tiger
Lewis Capaldi - Someone You Loved
Tones and I - Dance Monkey
Imagine Dragons - Believer
Sia - Chandelier
Coldplay - Viva la Vida
Maroon 5 - Sugar
Justin Timberlake - Can't Stop the Feeling!
Katy Perry - Roar
Taylor Swift - Shake It Off
Bruno Mars - Just the Way You Are
Shawn Mendes - Señorita
Glass Animals - Heat Waves
Lil Nas X - Old Town Road
Sabrina Carpenter - Espresso
Benson Boone - Beautiful Things
Teddy Swims - Lose Control
Hozier - Take Me to Church
Avicii - Wake Me Up
Eurythmics - Sweet Dreams (Are Made of This)
Cyndi Lauper - Girls Just Want to Have Fun
`,
  pop: `
Taylor Swift - Blank Space
Taylor Swift - Anti-Hero
Taylor Swift - Cruel Summer
Dua Lipa - Don't Start Now
Dua Lipa - New Rules
Ariana Grande - thank u, next
Ariana Grande - 7 rings
Justin Bieber - Sorry
Justin Bieber - Baby
Lady Gaga - Bad Romance
Lady Gaga - Just Dance
Katy Perry - Firework
Katy Perry - Hot N Cold
Rihanna - Diamonds
Rihanna - Don't Stop the Music
Britney Spears - ...Baby One More Time
Britney Spears - Oops!...I Did It Again
Backstreet Boys - I Want It That Way
Spice Girls - Wannabe
*NSYNC - Bye Bye Bye
Madonna - Like a Prayer
Madonna - Hung Up
Kylie Minogue - Can't Get You Out of My Head
Christina Aguilera - Genie in a Bottle
P!nk - So What
Kelly Clarkson - Since U Been Gone
Avril Lavigne - Complicated
Nelly Furtado - Promiscuous
Gwen Stefani - Hollaback Girl
Shakira - Hips Don't Lie
One Direction - What Makes You Beautiful
Selena Gomez - Lose You to Love Me
Olivia Rodrigo - good 4 u
Billie Eilish - BIRDS OF A FEATHER
Harry Styles - Watermelon Sugar
Lorde - Royals
Sam Smith - Stay with Me
Adele - Hello
Adele - Someone Like You
Ed Sheeran - Perfect
Ed Sheeran - Thinking Out Loud
Bruno Mars - Locked Out of Heaven
Maroon 5 - Moves like Jagger
Jonas Brothers - Sucker
Camila Cabello - Havana
Doja Cat - Say So
Lizzo - About Damn Time
Chappell Roan - Good Luck, Babe!
George Michael - Careless Whisper
Michael Jackson - Beat It
`,
  rock: `
Queen - Bohemian Rhapsody
Queen - Another One Bites the Dust
Nirvana - Smells Like Teen Spirit
Nirvana - Come as You Are
AC/DC - Back in Black
AC/DC - Highway to Hell
Guns N' Roses - Sweet Child O' Mine
Guns N' Roses - Welcome to the Jungle
Led Zeppelin - Stairway to Heaven
Led Zeppelin - Whole Lotta Love
The Rolling Stones - (I Can't Get No) Satisfaction
The Rolling Stones - Paint It, Black
The Beatles - Come Together
The Beatles - Hey Jude
Pink Floyd - Another Brick in the Wall, Pt. 2
Eagles - Hotel California
Metallica - Enter Sandman
Metallica - Nothing Else Matters
Red Hot Chili Peppers - Californication
Red Hot Chili Peppers - Can't Stop
Foo Fighters - Everlong
Foo Fighters - The Pretender
Linkin Park - In the End
Linkin Park - Numb
Green Day - Basket Case
Green Day - American Idiot
Oasis - Wonderwall
Radiohead - Creep
The Killers - Mr. Brightside
The White Stripes - Seven Nation Army
Arctic Monkeys - Do I Wanna Know?
Muse - Uprising
U2 - With or Without You
Bon Jovi - Livin' on a Prayer
Aerosmith - Dream On
Deep Purple - Smoke on the Water
Dire Straits - Sultans of Swing
The Police - Every Breath You Take
Blur - Song 2
The Cranberries - Zombie
System of a Down - Chop Suey!
Evanescence - Bring Me to Life
blink-182 - All the Small Things
The Offspring - Pretty Fly (For a White Guy)
Rage Against the Machine - Killing in the Name
Black Sabbath - Paranoid
David Bowie - Heroes
Fleetwood Mac - Go Your Own Way
Europe - The Final Countdown
Scorpions - Wind of Change
`,
  hiphop: `
Eminem - Lose Yourself
Eminem - Without Me
Eminem - The Real Slim Shady
50 Cent - In da Club
Dr. Dre - Still D.R.E.
Snoop Dogg - Drop It Like It's Hot
2Pac - California Love
The Notorious B.I.G. - Juicy
Coolio - Gangsta's Paradise
JAY-Z - Empire State of Mind
Kanye West - Stronger
Kanye West - Gold Digger
Kendrick Lamar - HUMBLE.
Kendrick Lamar - Not Like Us
Drake - Hotline Bling
Drake - God's Plan
Travis Scott - SICKO MODE
Post Malone - rockstar
Cardi B - Bodak Yellow
Nicki Minaj - Super Bass
Missy Elliott - Get Ur Freak On
OutKast - Ms. Jackson
Fugees - Killing Me Softly With His Song
House of Pain - Jump Around
MC Hammer - U Can't Touch This
Run-D.M.C. - It's Tricky
Beastie Boys - Sabotage
Cypress Hill - Insane in the Brain
Nelly - Hot in Herre
Usher - Yeah!
Macklemore & Ryan Lewis - Thrift Shop
Macklemore & Ryan Lewis - Can't Hold Us
Lil Wayne - Lollipop
T.I. - Live Your Life
Flo Rida - Low
Sean Paul - Get Busy
The Black Eyed Peas - Where Is the Love?
Wiz Khalifa - See You Again
Childish Gambino - This Is America
Tyler, The Creator - EARFQUAKE
Juice WRLD - Lucid Dreams
XXXTENTACION - SAD!
Roddy Ricch - The Box
Jack Harlow - First Class
Doja Cat - Paint The Town Red
Megan Thee Stallion - Savage
Future - Mask Off
A$AP Rocky - Praise The Lord (Da Shine)
Wu-Tang Clan - C.R.E.A.M.
Warren G - Regulate
`,
  electronica: `
Daft Punk - One More Time
Daft Punk - Get Lucky
Daft Punk - Around the World
Avicii - Levels
Avicii - Hey Brother
Swedish House Mafia - Don't You Worry Child
David Guetta - Titanium
David Guetta - When Love Takes Over
Calvin Harris - Summer
Calvin Harris - Feel So Close
Calvin Harris - One Kiss
Martin Garrix - Animals
Zedd - Clarity
Skrillex - Bangarang
deadmau5 - Ghosts 'n' Stuff
Major Lazer - Lean On
DJ Snake - Turn Down for What
The Chainsmokers - Closer
The Chainsmokers - Don't Let Me Down
Kygo - Firestone
Robin Schulz - Sugar
Alan Walker - Faded
Marshmello - Alone
Tiësto - The Business
Disclosure - Latch
Eiffel 65 - Blue (Da Ba Dee)
Darude - Sandstorm
Haddaway - What Is Love
Corona - The Rhythm of the Night
Snap! - Rhythm Is a Dancer
La Bouche - Be My Lover
Gala - Freed from Desire
Robert Miles - Children
Faithless - Insomnia
The Prodigy - Firestarter
The Chemical Brothers - Hey Boy Hey Girl
Fatboy Slim - Praise You
Moby - Porcelain
Modjo - Lady (Hear Me Tonight)
Stardust - Music Sounds Better With You
Eric Prydz - Call on Me
Benny Benassi - Satisfaction
Bob Sinclar - Love Generation
Basshunter - Now You're Gone
Alice Deejay - Better Off Alone
ATB - 9 PM (Till I Come)
Fred again.. - Delilah (pull me out of this)
Meduza - Piece Of Your Heart
Purple Disco Machine - Hypnotized
Justice - D.A.N.C.E.
`,
  espanol: `
Bad Bunny - Tití Me Preguntó
Bad Bunny - DÁKITI
Rosalía - MALAMENTE
Rosalía - DESPECHÁ
Shakira - La Tortura
Shakira - Antología
C. Tangana - Tú Me Dejaste De Querer
Quevedo - Columbia
Bizarrap - Quevedo: Bzrp Music Sessions, Vol. 52
Daddy Yankee - Gasolina
Don Omar - Danza Kuduro
J Balvin - Mi Gente
Karol G - PROVENZA
Karol G - TQG
Enrique Iglesias - Bailando
Juanes - La Camisa Negra
Maná - Rayando el Sol
Soda Stereo - De Música Ligera
Héroes del Silencio - Entre Dos Tierras
Mecano - Hijo de la Luna
Mecano - Mujer Contra Mujer
Hombres G - Devuélveme a Mi Chica
La Oreja de Van Gogh - Rosas
La Oreja de Van Gogh - La Playa
Estopa - Como Camarón
Estopa - La Raja de Tu Falda
Melendi - Caminando por la Vida
Alejandro Sanz - Corazón Partío
Joaquín Sabina - 19 Días y 500 Noches
Los Rodríguez - Sin Documentos
Jarabe de Palo - La Flaca
Amaral - Sin Ti No Soy Nada
El Canto del Loco - Zapatillas
Pereza - Princesas
Fito & Fitipaldis - Soldadito Marinero
Extremoduro - So Payaso
Loquillo y Los Trogloditas - Cadillac Solitario
Nacha Pop - Lucha de Gigantes
Los Del Río - Macarena
Las Ketchup - Aserejé
Ricky Martin - Livin' la Vida Loca
Marc Anthony - Vivir Mi Vida
Celia Cruz - La Vida Es Un Carnaval
Julieta Venegas - Limón y Sal
Café Tacvba - Eres
Nino Bravo - Libre
Raphael - Mi Gran Noche
Aitana - Vas a Quedarte
Rauw Alejandro - Todo de Ti
Sebastián Yatra - Tacones Rojos
`,
  // Formato: Artista - Título | Película
  cine: `
John Williams - Hedwig's Theme | Harry Potter
John Williams - The Imperial March (Darth Vader's Theme) | Star Wars: El Imperio contraataca
John Williams - Duel of the Fates | Star Wars: La amenaza fantasma
John Williams - Cantina Band | Star Wars
John Williams - Theme from Jurassic Park | Parque Jurásico
John Williams - The Raiders March | Indiana Jones
John Williams - Theme from Schindler's List | La lista de Schindler
John Williams - Main Title (Theme From Jaws) | Tiburón
John Williams - Flying | E.T., el extraterrestre
John Williams - Somewhere in My Memory | Solo en casa
John Williams - Superman March | Superman
Hans Zimmer - Time | Origen
Hans Zimmer - Cornfield Chase | Interstellar
Hans Zimmer - No Time for Caution | Interstellar
Hans Zimmer - Day One | Interstellar
Hans Zimmer - Now We Are Free | Gladiator
Klaus Badelt - He's a Pirate | Piratas del Caribe
Hans Zimmer - Why So Serious? | El caballero oscuro
Hans Zimmer - Chevaliers de Sangreal | El código Da Vinci
Hans Zimmer - Discombobulate | Sherlock Holmes
Hans Zimmer - This Land | El rey león
Hans Zimmer - Paul's Dream | Dune
Hans Zimmer - Flight | El hombre de acero
Hans Zimmer - Supermarine | Dunkerque
Hans Zimmer - Tennessee | Pearl Harbor
Howard Shore - Concerning Hobbits | El Señor de los Anillos
Howard Shore - The Bridge of Khazad Dum | El Señor de los Anillos
Howard Shore - The Breaking of the Fellowship | El Señor de los Anillos
Ennio Morricone - The Ecstasy of Gold | El bueno, el feo y el malo
Ennio Morricone - The Good, the Bad and the Ugly | El bueno, el feo y el malo
Ennio Morricone - Gabriel's Oboe | La misión
Ennio Morricone - Cinema Paradiso | Cinema Paradiso
Ennio Morricone - Once Upon a Time in the West | Hasta que llegó su hora
Ennio Morricone - Chi Mai | El profesional
Ennio Morricone - Deborah's Theme | Érase una vez en América
Nino Rota - Love Theme from The Godfather | El padrino
Nino Rota - The Godfather Waltz | El padrino
Alan Silvestri - Back to the Future | Regreso al futuro
Alan Silvestri - The Avengers | Los Vengadores
Alan Silvestri - Portals | Vengadores: Endgame
Alan Silvestri - Feather Theme | Forrest Gump
James Horner - For the Love of a Princess | Braveheart
James Horner - Rose | Titanic
James Horner - Hymn to the Sea | Titanic
James Horner - Jake's First Flight | Avatar
James Horner - A Kaleidoscope of Mathematics | Una mente maravillosa
John Barry - The John Dunbar Theme | Bailando con lobos
John Barry - Somewhere in Time | En algún lugar del tiempo
Monty Norman - James Bond Theme | James Bond
Vangelis - Chariots of Fire | Carros de fuego
Vangelis - Conquest of Paradise | 1492: La conquista del paraíso
Vangelis - Blade Runner (End Titles) | Blade Runner
Bill Conti - Gonna Fly Now | Rocky
Bill Conti - Going the Distance | Rocky
Danny Elfman - The Batman Theme | Batman
Danny Elfman - This Is Halloween | Pesadilla antes de Navidad
Danny Elfman - What's This? | Pesadilla antes de Navidad
Danny Elfman - Ice Dance | Eduardo Manostijeras
Yann Tiersen - Comptine d'un autre été, l'après-midi | Amélie
Yann Tiersen - La valse d'Amélie | Amélie
Ludovico Einaudi - Una Mattina | Intocable
Ludovico Einaudi - Fly | Intocable
Clint Mansell - Lux Aeterna | Réquiem por un sueño
Joe Hisaishi - One Summer's Day | El viaje de Chihiro
Joe Hisaishi - Merry-Go-Round of Life | El castillo ambulante
Joe Hisaishi - The Path of the Wind | Mi vecino Totoro
Michael Giacchino - Married Life | Up
Michael Giacchino - The Incredits | Los Increíbles
Camille - Le Festin | Ratatouille
Thomas Newman - Define Dancing | WALL·E
Thomas Newman - Any Other Name | American Beauty
Thomas Newman - Brooks Was Here | Cadena perpetua
Thomas Newman - Nemo Egg (Main Title) | Buscando a Nemo
Randy Newman - You've Got a Friend in Me | Toy Story
Justin Hurwitz - Mia & Sebastian's Theme | La La Land
La La Land Cast - Another Day of Sun | La La Land
Ryan Gosling - City of Stars | La La Land
Emma Stone - Audition (The Fools Who Dream) | La La Land
Harold Faltermeyer - Axel F | Superdetective en Hollywood
Harold Faltermeyer - Top Gun Anthem | Top Gun
Ray Parker Jr. - Ghostbusters | Los cazafantasmas
Lalo Schifrin - Mission: Impossible | Misión imposible
Henry Mancini - The Pink Panther Theme | La pantera rosa
Henry Mancini - Moon River | Desayuno con diamantes
Elmer Bernstein - The Magnificent Seven | Los siete magníficos
Maurice Jarre - Lara's Theme | Doctor Zhivago
Bernard Herrmann - Twisted Nerve | Kill Bill
Mike Oldfield - Tubular Bells | El exorcista
John Carpenter - Halloween Theme | Halloween
Gustavo Santaolalla - The Wings | Brokeback Mountain
Gustavo Santaolalla - De Ushuaia a La Quiaca | Diarios de motocicleta
Alexandre Desplat - Lily's Theme | Harry Potter y las reliquias de la muerte
Alexandre Desplat - The Imitation Game | The Imitation Game
Ludwig Göransson - Can You Hear the Music | Oppenheimer
Ludwig Göransson - Wakanda | Black Panther
Hildur Guðnadóttir - Bathroom Dance | Joker
Trent Reznor - In Motion | La red social
Daft Punk - Derezzed | Tron: Legacy
Steve Jablonsky - Arrival to Earth | Transformers
John Powell - Test Drive | Cómo entrenar a tu dragón
John Powell - Forbidden Friendship | Cómo entrenar a tu dragón
Dario Marianelli - Dawn | Orgullo y prejuicio
Craig Armstrong - Glasgow Love Theme | Love Actually
Carter Burwell - Bella's Lullaby | Crepúsculo
James Newton Howard - The Hanging Tree | Los juegos del hambre: Sinsajo
Ryuichi Sakamoto - Merry Christmas Mr. Lawrence | Feliz Navidad, Mr. Lawrence
Michael Nyman - The Heart Asks Pleasure First | El piano
Max Richter - On the Nature of Daylight | La llegada
Basil Poledouris - Anvil of Crom | Conan el Bárbaro
Brad Fiedel - Main Title (Terminator 2 Theme) | Terminator 2
Junkie XL - Brothers in Arms | Mad Max: Furia en la carretera
Trevor Jones - Promentory | El último mohicano
John Murphy - In the House - In a Heartbeat | 28 días después
John Murphy - Adagio in D Minor | Sunshine
Giorgio Moroder - Chase | El expreso de medianoche
Anton Karas - The Harry Lime Theme | El tercer hombre
Mikis Theodorakis - Zorba's Dance | Zorba el griego
Francis Lai - Theme from Love Story | Love Story
Marvin Hamlisch - The Entertainer | El golpe
Elton John - Can You Feel the Love Tonight | El rey león
Carmen Twillie - Circle of Life | El rey león
Céline Dion - My Heart Will Go On | Titanic
Céline Dion - Because You Loved Me | Íntimo y personal
Whitney Houston - I Will Always Love You | El guardaespaldas
Kenny Loggins - Danger Zone | Top Gun
Kenny Loggins - Footloose | Footloose
Bonnie Tyler - Holding Out for a Hero | Footloose
Deniece Williams - Let's Hear It for the Boy | Footloose
Berlin - Take My Breath Away | Top Gun
Lady Gaga - Hold My Hand | Top Gun: Maverick
OneRepublic - I Ain't Worried | Top Gun: Maverick
Bill Medley - (I've Had) The Time of My Life | Dirty Dancing
Eric Carmen - Hungry Eyes | Dirty Dancing
Patrick Swayze - She's Like the Wind | Dirty Dancing
The Ronettes - Be My Baby | Dirty Dancing
Irene Cara - Flashdance... What a Feeling | Flashdance
Michael Sembello - Maniac | Flashdance
Irene Cara - Fame | Fama
Bee Gees - Night Fever | Fiebre del sábado noche
Bee Gees - How Deep Is Your Love | Fiebre del sábado noche
Bee Gees - More Than a Woman | Fiebre del sábado noche
Yvonne Elliman - If I Can't Have You | Fiebre del sábado noche
The Trammps - Disco Inferno | Fiebre del sábado noche
John Travolta - You're the One That I Want | Grease
John Travolta - Summer Nights | Grease
Frankie Valli - Grease | Grease
Olivia Newton-John - Hopelessly Devoted to You | Grease
Simple Minds - Don't You (Forget About Me) | El club de los cinco
Huey Lewis & The News - The Power of Love | Regreso al futuro
Huey Lewis & The News - Back in Time | Regreso al futuro
Chuck Berry - Johnny B. Goode | Regreso al futuro
The Chordettes - Mr. Sandman | Regreso al futuro
Roy Orbison - Oh, Pretty Woman | Pretty Woman
Roxette - It Must Have Been Love | Pretty Woman
The Righteous Brothers - Unchained Melody | Ghost
Aerosmith - I Don't Want to Miss a Thing | Armageddon
Bryan Adams - (Everything I Do) I Do It for You | Robin Hood, príncipe de los ladrones
Bryan Adams - Here I Am | Spirit
Seal - Kiss from a Rose | Batman Forever
U2 - Hold Me, Thrill Me, Kiss Me, Kill Me | Batman Forever
Simon & Garfunkel - Mrs. Robinson | El graduado
Simon & Garfunkel - The Sound of Silence | El graduado
Steppenwolf - Born to Be Wild | Easy Rider
The Doors - The End | Apocalypse Now
Chuck Berry - You Never Can Tell | Pulp Fiction
Dick Dale - Misirlou | Pulp Fiction
Urge Overkill - Girl, You'll Be a Woman Soon | Pulp Fiction
Stealers Wheel - Stuck in the Middle with You | Reservoir Dogs
Nancy Sinatra - Bang Bang (My Baby Shot Me Down) | Kill Bill
Tomoyasu Hotei - Battle Without Honor or Humanity | Kill Bill
Santa Esmeralda - Don't Let Me Be Misunderstood | Kill Bill
Iggy Pop - Lust for Life | Trainspotting
Underworld - Born Slippy (Nuxx) | Trainspotting
Pixies - Where Is My Mind? | El club de la lucha
Gary Jules - Mad World | Donnie Darko
Tears for Fears - Head Over Heels | Donnie Darko
The Proclaimers - I'm Gonna Be (500 Miles) | Benny & Joon
Smash Mouth - All Star | Shrek
Smash Mouth - I'm a Believer | Shrek
Rufus Wainwright - Hallelujah | Shrek
Counting Crows - Accidentally in Love | Shrek 2
Phil Collins - You'll Be in My Heart | Tarzán
Phil Collins - Against All Odds (Take a Look at Me Now) | Contra todo riesgo
Phil Collins - In the Air Tonight | Resacón en Las Vegas
Idina Menzel - Let It Go | Frozen
Kristen Bell - Do You Want to Build a Snowman? | Frozen
Auliʻi Cravalho - How Far I'll Go | Vaiana
Dwayne Johnson - You're Welcome | Vaiana
Carolina Gaitán - We Don't Talk About Bruno | Encanto
Brad Kane - A Whole New World | Aladdín
Robin Williams - Friend Like Me | Aladdín
Jodi Benson - Part of Your World | La sirenita
Samuel E. Wright - Under the Sea | La sirenita
Angela Lansbury - Beauty and the Beast | La bella y la bestia
Judy Kuhn - Colors of the Wind | Pocahontas
Donny Osmond - I'll Make a Man Out of You | Mulán
Shakira - Try Everything | Zootrópolis
Lady Gaga - Shallow | Ha nacido una estrella
Adele - Skyfall | Skyfall
Billie Eilish - No Time To Die | Sin tiempo para morir
Sam Smith - Writing's on the Wall | Spectre
Shirley Bassey - Goldfinger | Goldfinger
Tina Turner - GoldenEye | GoldenEye
Duran Duran - A View to a Kill | Panorama para matar
Wings - Live and Let Die | Vive y deja morir
Billie Eilish - What Was I Made For? | Barbie
Dua Lipa - Dance The Night | Barbie
Ryan Gosling - I'm Just Ken | Barbie
Kendrick Lamar - All The Stars | Black Panther
Rihanna - Lift Me Up | Black Panther: Wakanda Forever
Post Malone - Sunflower | Spider-Man: Un nuevo universo
Chad Kroeger - Hero | Spider-Man
Hugh Jackman - The Greatest Show | El gran showman
Keala Settle - This Is Me | El gran showman
Zac Efron - Rewrite the Stars | El gran showman
Loren Allred - Never Enough | El gran showman
Queen - Flash's Theme | Flash Gordon
Queen - Who Wants to Live Forever | Los inmortales
Prince - Purple Rain | Purple Rain
Prince - When Doves Cry | Purple Rain
Bob Seger - Old Time Rock & Roll | Risky Business
Joe Cocker - Up Where We Belong | Oficial y caballero
Joe Cocker - You Can Leave Your Hat On | Nueve semanas y media
Stevie Wonder - I Just Called to Say I Love You | La mujer de rojo
Lionel Richie - Say You, Say Me | Noches de sol
Starship - Nothing's Gonna Stop Us Now | Maniquí
Limahl - Never Ending Story | La historia interminable
Cyndi Lauper - The Goonies 'R' Good Enough | Los Goonies
Peter Cetera - Glory of Love | Karate Kid II
Joe Esposito - You're the Best | Karate Kid
Blondie - Call Me | American Gigolo
Dolly Parton - 9 to 5 | Cómo eliminar a su jefe
B.J. Thomas - Raindrops Keep Fallin' on My Head | Dos hombres y un destino
Harry Nilsson - Everybody's Talkin' | Cowboy de medianoche
Gene Kelly - Singin' in the Rain | Cantando bajo la lluvia
Judy Garland - Over the Rainbow | El mago de Oz
Julie Andrews - Do-Re-Mi | Sonrisas y lágrimas
Julie Andrews - Supercalifragilisticexpialidocious | Mary Poppins
Gene Wilder - Pure Imagination | Un mundo de fantasía
Louis Armstrong - What a Wonderful World | Good Morning, Vietnam
Ben E. King - Stand by Me | Cuenta conmigo
Creedence Clearwater Revival - Fortunate Son | Forrest Gump
Lynyrd Skynyrd - Sweet Home Alabama | Forrest Gump
The Mamas & The Papas - California Dreamin' | Forrest Gump
Blue Swede - Hooked on a Feeling | Guardianes de la Galaxia
Redbone - Come and Get Your Love | Guardianes de la Galaxia
Electric Light Orchestra - Mr. Blue Sky | Guardianes de la Galaxia Vol. 2
Looking Glass - Brandy (You're a Fine Girl) | Guardianes de la Galaxia Vol. 2
AC/DC - Shoot to Thrill | Iron Man 2
Led Zeppelin - Immigrant Song | Thor: Ragnarok
The Rolling Stones - Gimme Shelter | Infiltrados
Derek & The Dominos - Layla | Uno de los nuestros
The Animals - The House of the Rising Sun | Casino
ABBA - Mamma Mia | Mamma Mia!
Christina Aguilera - Lady Marmalade | Moulin Rouge
Ewan McGregor - Come What May | Moulin Rouge
Anne Hathaway - I Dreamed a Dream | Los miserables
Cynthia Erivo - Defying Gravity | Wicked
Bruce Springsteen - Streets of Philadelphia | Philadelphia
Bob Dylan - Knockin' on Heaven's Door | Pat Garrett y Billy the Kid
Sixpence None the Richer - Kiss Me | Alguien como tú
Goo Goo Dolls - Iris | City of Angels
LeAnn Rimes - Can't Fight the Moonlight | El bar Coyote
Destiny's Child - Independent Women, Pt. 1 | Los ángeles de Charlie
Will Smith - Men in Black | Men in Black
The Weeknd - Earned It | Cincuenta sombras de Grey
Ellie Goulding - Love Me like You Do | Cincuenta sombras de Grey
Christina Perri - A Thousand Years | Crepúsculo: Amanecer
Paramore - Decode | Crepúsculo
Muse - Supermassive Black Hole | Crepúsculo
Taylor Swift - Safe & Sound | Los juegos del hambre
Lana Del Rey - Young and Beautiful | El gran Gatsby
Twenty One Pilots - Heathens | Escuadrón suicida
Linkin Park - What I've Done | Transformers
Linkin Park - New Divide | Transformers: La venganza de los caídos
Rob Zombie - Dragula | Matrix
Rage Against the Machine - Wake Up | Matrix
Moby - Extreme Ways | El caso Bourne
Survivor - Burning Heart | Rocky IV
Robert Tepper - No Easy Way Out | Rocky IV
James Brown - Living in America | Rocky IV
Tina Turner - We Don't Need Another Hero (Thunderdome) | Mad Max 3
Madonna - Into the Groove | Buscando a Susan desesperadamente
Madonna - Don't Cry for Me Argentina | Evita
Los Lobos - La Bamba | La Bamba
Los Lobos - Canción del Mariachi | Desperado
Tito & Tarantula - After Dark | Abierto hasta el amanecer
Luz Casal - Piensa en Mí | Tacones lejanos
Caetano Veloso - Cucurrucucú Paloma | Hable con ella
The Blues Brothers - Everybody Needs Somebody to Love | Granujas a todo ritmo
Aretha Franklin - Think | Granujas a todo ritmo
Bobby McFerrin - Don't Worry Be Happy | Cocktail
The Beach Boys - Kokomo | Cocktail
Yello - Oh Yeah | Todo en un día
The Beatles - Twist and Shout | Todo en un día
Harry Belafonte - Day-O (The Banana Boat Song) | Bitelchús
Sting - Shape of My Heart | El profesional (Léon)
Eddie Vedder - Society | Hacia rutas salvajes
Glen Hansard - Falling Slowly | Once
Kavinsky - Nightcall | Drive
College - A Real Hero | Drive
Enya - May It Be | El Señor de los Anillos
Annie Lennox - Into the West | El Señor de los Anillos: El retorno del Rey
Ed Sheeran - I See Fire | El Hobbit
Eric Clapton - Tears in Heaven | Rush
Glenn Frey - The Heat Is On | Superdetective en Hollywood
Elvis Presley - Can't Help Falling in Love | Amor en Hawái
Elvis Presley - Jailhouse Rock | El rock de la cárcel
Elvis Presley - A Little Less Conversation | Ocean's Eleven
Doris Day - Que Sera, Sera | El hombre que sabía demasiado
Dooley Wilson - As Time Goes By | Casablanca
Monty Python - Always Look on the Bright Side of Life | La vida de Brian
Sufjan Stevens - Mystery of Love | Call Me by Your Name
Anna Kendrick - Cups | Dando la nota
David Bowie - Magic Dance | Dentro del laberinto
Michael Jackson - Will You Be There | Liberad a Willy
Faith Hill - There You'll Be | Pearl Harbor
Wet Wet Wet - Love Is All Around | Cuatro bodas y un funeral
Ronan Keating - When You Say Nothing at All | Notting Hill
Elvis Costello - She | Notting Hill
Harry Connick Jr. - It Had to Be You | Cuando Harry encontró a Sally
The Cardigans - Lovefool | Romeo + Julieta
Chris Isaak - Wicked Game | Corazón salvaje
Q Lazzarus - Goodbye Horses | El silencio de los corderos
Huey Lewis & The News - Hip to Be Square | American Psycho
`,
};

const norm = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ').trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(q) {
  for (let i = 0; i < 4; i++) {
    const res = await fetch('https://api.deezer.com/search?limit=15&q=' + encodeURIComponent(q));
    const j = await res.json().catch(() => ({}));
    if (j.data) return j.data;
    await sleep(1500);
  }
  return [];
}

const BAD = /karaoke|tribute|cover|live|en vivo|directo|remix|instrumental|version|edit|acoustic|demo|mix\b/;

async function resolve(artist, title) {
  const na = norm(artist).split(' and ')[0], nt = norm(title);
  const tries = [`artist:"${artist}" track:"${title}"`, `${artist} ${title}`];
  for (const q of tries) {
    const data = await search(q);
    const multi = nt.includes(' ');
    const ok = data.filter((t) => {
      const ta = norm(t.artist.name), tt = norm(t.title);
      if (!t.preview || /made famous|karaoke|tribute/i.test(t.artist.name)) return false;
      if (!(ta.includes(na) || (ta.length >= 4 && na.includes(ta)))) return false;
      t._exact = tt === nt;
      return t._exact || (multi && tt.includes(nt));
    });
    if (!ok.length) continue;
    const isClean = (t) => !BAD.test(t.title.toLowerCase().replace(title.toLowerCase(), '')) && !BAD.test((t.album?.title || '').toLowerCase());
    // primero título exacto y versión original; después lo demás
    const score = (t) => (t._exact ? 2 : 0) + (isClean(t) ? 1 : 0);
    return ok.sort((a, b) => score(b) - score(a) || b.rank - a.rank)[0];
  }
  return null;
}

const here = dirname(fileURLToPath(import.meta.url));
// Reutiliza lo ya resuelto para no cambiar canciones existentes ni repetir peticiones
const known = new Map();
try {
  const prev = JSON.parse(readFileSync(join(here, '..', 'catalog.js'), 'utf8').replace(/^[^{]*/, '').replace(/;\s*$/, ''));
  for (const list of Object.values(prev)) for (const e of list) known.set(e.a + '|' + e.t, e.id);
} catch {}

const LIMIT = {};
const FRESH = new Set((process.argv[2] || '').split(',').filter(Boolean)); // categorías a resolver de cero
const out = {};
const missing = [];
for (const [cat, raw] of Object.entries(LISTS)) {
  out[cat] = [];
  const seen = new Set();
  for (const full of raw.trim().split('\n')) {
    if (out[cat].length >= (LIMIT[cat] || Infinity)) break;
    const [line, film] = full.split(' | ').map((s) => s.trim());
    const i = line.indexOf(' - ');
    const artist = line.slice(0, i).trim(), title = line.slice(i + 3).trim();
    let id = FRESH.has(cat) ? null : known.get(artist + '|' + title);
    if (!id) {
      const t = await resolve(artist, title);
      if (!t) { missing.push(`${cat}: ${line}`); continue; }
      id = t.id; await sleep(120);
    }
    if (seen.has(id)) continue; seen.add(id);
    out[cat].push(film ? { id, a: artist, t: title, f: film } : { id, a: artist, t: title });
  }
  console.log(cat, out[cat].length);
}
writeFileSync(join(here, '..', 'catalog.js'),
  '// Generado por tools/build-catalog.mjs — no editar a mano\nwindow.CATALOG = ' + JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"').replace(/\},\{/g, '},\n{') + ';\n');
console.log('Sin resolver:', missing.length);
missing.forEach((m) => console.log('  ' + m));
