/**
 * Frontend data adapter: single source of truth for all ward data.
 * 
 * Reads from the master data file (shared/data/chicago-wards.ts)
 * and shapes it into the types the UI components expect.
 * 
 * Data sources:
 *   - Chicago Data Portal API: https://data.cityofchicago.org/resource/htai-wnw4.json
 *   - Chicago.gov wards page: https://www.chicago.gov/city/en/about/wards.html
 *   - Last verified: 2026-02-21
 */

import { Ward, Alderman, Office } from '@/types'

// ─── Master record shape ────────────────────────────────────────────────────
export interface WardDataRecord {
  ward: number
  alderperson: string
  wardOfficeAddress: string
  wardOfficeCity: string
  wardOfficeState: string
  wardOfficeZip: string
  wardPhone: string
  wardFax: string | null
  email: string
  website: string | null
  cityHallAddress: string
  cityHallPhone: string
  photoUrl: string | null
  neighborhoods: string[]
  latitude: number
  longitude: number
}

// ─── All 50 wards ──────────────────────────────────────────────────────────
// Sourced from https://data.cityofchicago.org/resource/htai-wnw4.json
// and https://www.chicago.gov/city/en/about/wards.html
// Verified 2026-02-21

export const CHICAGO_WARDS: WardDataRecord[] = [
  { ward: 1, alderperson: 'Daniel La Spata', wardOfficeAddress: '1958 North Milwaukee Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60647', wardPhone: '(872) 206-2685', wardFax: '(312) 448-8829', email: 'Ward01@cityofchicago.org', website: 'https://www.the1stward.com/', cityHallAddress: '121 North LaSalle Street, Room 300, Office 13', cityHallPhone: '(312) 744-3063', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/41A0E156-F788-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Logan Square', 'West Town', 'Wicker Park', 'Bucktown', 'Humboldt Park', 'Ukrainian Village', 'East Village'], latitude: 41.91694, longitude: -87.68783 },
  { ward: 2, alderperson: 'Brian Hopkins', wardOfficeAddress: '121 North LaSalle Street, Room 300', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60602', wardPhone: '(312) 744-6836', wardFax: null, email: 'office@aldermanhopkins.com', website: 'https://www.aldermanhopkins.com/', cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-6836', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/B160E94E-FB88-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Near North Side', 'Old Town', 'Gold Coast', 'Streeterville', 'River North'], latitude: 41.88376, longitude: -87.63228 },
  { ward: 3, alderperson: 'Pat Dowell', wardOfficeAddress: '5046 South State Street', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60609', wardPhone: '(773) 373-9273', wardFax: '(773) 373-6852', email: 'Ward03@cityofchicago.org', website: 'http://www.ward03chicago.com', cityHallAddress: '121 North LaSalle Street, Room 302', cityHallPhone: '(312) 744-8734', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/B66788C7-FA88-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Bronzeville', 'Douglas', 'Grand Boulevard', 'South Loop'], latitude: 41.80236, longitude: -87.62605 },
  { ward: 4, alderperson: 'Lamont J. Robinson', wardOfficeAddress: '928 East 43rd Street', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60653', wardPhone: '(312) 744-2690', wardFax: null, email: 'Ward04@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-2690', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/80D52B16-6AF3-ED11-A7C6-001DD804FC2B.jpg', neighborhoods: ['Bronzeville', 'Kenwood', 'North Kenwood', 'Oakland'], latitude: 41.81697, longitude: -87.60284 },
  { ward: 5, alderperson: 'Desmon C. Yancy', wardOfficeAddress: '2230 East 71st Street', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60649', wardPhone: '(312) 744-6832', wardFax: null, email: 'Ward05@cityofchicago.org', website: null, cityHallAddress: '121 N. LaSalle Street Room 200', cityHallPhone: '(312) 744-6832', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/E0AC4B85-6AF3-ED11-A7C6-001DD804FC2B.jpg', neighborhoods: ['Hyde Park', 'South Shore', 'Woodlawn', 'Jackson Park Highlands'], latitude: 41.76641, longitude: -87.57015 },
  { ward: 6, alderperson: 'William E. Hall', wardOfficeAddress: '8541 South State Street', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60619', wardPhone: '(773) 241-3100', wardFax: null, email: 'Ward06@cityofchicago.org', website: null, cityHallAddress: '121 N. LaSalle St. Room 300', cityHallPhone: '(312) 744-6868', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/7D95D6BB-6AF3-ED11-A7C6-001DD804FC2B.jpg', neighborhoods: ['Chatham', 'Greater Grand Crossing', 'Park Manor', 'Woodlawn'], latitude: 41.73879, longitude: -87.62406 },
  { ward: 7, alderperson: 'Gregory I. Mitchell', wardOfficeAddress: '2249 East 95th Street', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60617', wardPhone: '(773) 731-7777', wardFax: '(877) 961-4426', email: 'Ward07@cityofchicago.org', website: 'http://www.gregmitchell7thward.org/', cityHallAddress: '121 North LaSalle Street, Room 304', cityHallPhone: '(312) 744-6833', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/2E656B9F-C373-EC11-8F8E-001DD804F9F3.jpg', neighborhoods: ['South Shore', 'South Chicago', 'Calumet Heights', 'Avalon Park'], latitude: 41.72244, longitude: -87.56861 },
  { ward: 8, alderperson: 'Michelle A. Harris', wardOfficeAddress: '8539 South Cottage Grove Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60619', wardPhone: '(773) 874-3300', wardFax: '(773) 224-2425', email: 'Ward08@cityofchicago.org', website: 'http://www.Aldermanmichelleharris.net', cityHallAddress: '121 North LaSalle Street, Room 200', cityHallPhone: '(312) 744-3075', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/886B5C20-F788-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Chatham', 'Auburn Gresham', 'Avalon Park', 'Burnside'], latitude: 41.73912, longitude: -87.60474 },
  { ward: 9, alderperson: 'Anthony Beale', wardOfficeAddress: '34 East 112th Place', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60628', wardPhone: '(773) 785-1100', wardFax: '(773) 785-2900', email: 'Ward09@cityofchicago.org', website: 'http://www.Ward09.com', cityHallAddress: '121 North LaSalle Street, Room 200', cityHallPhone: '(312) 744-6838', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/AC394D1C-F988-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Roseland', 'Pullman', 'West Pullman', 'Riverdale'], latitude: 41.69000, longitude: -87.62172 },
  { ward: 10, alderperson: 'Peter Chico', wardOfficeAddress: '10500 South Ewing Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60617', wardPhone: '(773) 768-8138', wardFax: null, email: 'Ward10@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 200', cityHallPhone: '(312) 744-3078', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/4C168A10-6BF3-ED11-A7C6-001DD804FC2B.jpg', neighborhoods: ['East Side', 'South Deering', 'Hegewisch', 'South Chicago'], latitude: 41.70447, longitude: -87.53543 },
  { ward: 11, alderperson: 'Nicole T. Lee', wardOfficeAddress: '3659 South Halsted Street', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60609', wardPhone: '(773) 254-6677', wardFax: null, email: 'Ward11@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-6663', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/E29E5122-7BB7-EC11-983E-001DD8049E83.jpg', neighborhoods: ['Bridgeport', 'Chinatown', 'Armour Square', 'McKinley Park'], latitude: 41.82713, longitude: -87.64588 },
  { ward: 12, alderperson: 'Julia M. Ramirez', wardOfficeAddress: '3868 South Archer Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60632', wardPhone: '(773) 475-6783', wardFax: null, email: 'Ward12@cityofchicago.org', website: null, cityHallAddress: '121 North Lasalle, Room 200', cityHallPhone: '(312) 744-3068', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/9E248041-6BF3-ED11-A7C6-001DD804FC2B.jpg', neighborhoods: ['Brighton Park', 'McKinley Park', 'Archer Heights', 'Gage Park'], latitude: 41.82326, longitude: -87.68953 },
  { ward: 13, alderperson: 'Marty Quinn', wardOfficeAddress: '6500 South Pulaski Road', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60629', wardPhone: '(773) 581-8000', wardFax: '(773) 581-9414', email: 'Ward13@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-3058', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/97A2C337-FC88-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Clearing', 'Garfield Ridge', 'West Lawn', 'Chicago Lawn'], latitude: 41.77496, longitude: -87.72281 },
  { ward: 14, alderperson: 'Jeylu B. Gutierrez', wardOfficeAddress: '3124 West 59th Street', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60629', wardPhone: '(773) 236-0117', wardFax: null, email: 'Ward14@cityofchicago.org', website: null, cityHallAddress: '121 North Lasalle, Room 300', cityHallPhone: '(312) 744-6580', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/2E2DFB80-6BF3-ED11-A7C6-001DD804FC2B.jpg', neighborhoods: ['Gage Park', 'Chicago Lawn', 'West Elsdon', 'West Lawn'], latitude: 41.78638, longitude: -87.70207 },
  { ward: 15, alderperson: 'Raymond A. Lopez', wardOfficeAddress: '2650 West 51st Street', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60632', wardPhone: '(773) 823-1539', wardFax: '(773) 424-8720', email: 'Ward15@cityofchicago.org', website: 'http://www.the15thward.org', cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-4321', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/0AD4F54F-FC88-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Brighton Park', 'Back of the Yards', 'New City', 'Gage Park'], latitude: 41.80115, longitude: -87.69116 },
  { ward: 16, alderperson: 'Stephanie D. Coleman', wardOfficeAddress: '1137 West 63rd Street, Unit C', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60621', wardPhone: '(773) 306-1981', wardFax: null, email: 'Ward16@cityofchicago.org', website: 'https://www.16thward.org', cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-6850', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/E019D2FB-F788-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Englewood', 'West Englewood', 'Auburn Gresham'], latitude: 41.77951, longitude: -87.65351 },
  { ward: 17, alderperson: 'David H. Moore', wardOfficeAddress: '1344 West 79th Street', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60620', wardPhone: '(773) 783-3672', wardFax: null, email: 'Ward17@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-3435', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/EF6C6F46-F988-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Auburn Gresham', 'Ashburn', 'Beverly', 'Washington Heights'], latitude: 41.75056, longitude: -87.65699 },
  { ward: 18, alderperson: 'Derrick G. Curtis', wardOfficeAddress: '8359 South Pulaski Road', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60652', wardPhone: '(773) 284-5057', wardFax: '(773) 284-5956', email: 'Ward18@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-6856', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/EE27295C-FC88-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Ashburn', 'Wrightwood', 'Scottsdale', 'Chicago Lawn'], latitude: 41.74040, longitude: -87.72147 },
  { ward: 19, alderperson: "Matthew J. O'Shea", wardOfficeAddress: '10400 South Western Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60643', wardPhone: '(773) 238-8766', wardFax: '(773) 672-5133', email: 'Ward19@cityofchicago.org', website: 'http://the19thward.com/', cityHallAddress: '121 North LaSalle Street, Room 200', cityHallPhone: '(312) 744-3072', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/8E62E57A-F788-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Beverly', 'Morgan Park', 'Mount Greenwood'], latitude: 41.70446, longitude: -87.68171 },
  { ward: 20, alderperson: 'Jeanette B. Taylor', wardOfficeAddress: '5401 South Wentworth Avenue, Suite 19E', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60621', wardPhone: '(773) 966-5336', wardFax: null, email: 'Ward20@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-6840', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/E3010C0E-F888-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Back of the Yards', 'New City', 'Englewood', 'Washington Park'], latitude: 41.79623, longitude: -87.63040 },
  { ward: 21, alderperson: 'Ronnie L. Mosley', wardOfficeAddress: '10805 South Halsted Street', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60628', wardPhone: '(773) 881-9300', wardFax: null, email: 'Ward21@cityofchicago.org', website: null, cityHallAddress: '121 North Lasalle, Room 200', cityHallPhone: '(312) 744-4810', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/8B0682AE-6BF3-ED11-A7C6-001DD804FC2B.jpg', neighborhoods: ['Morgan Park', 'Washington Heights', 'Roseland', 'West Pullman'], latitude: 41.69762, longitude: -87.64240 },
  { ward: 22, alderperson: 'Michael D. Rodriguez', wardOfficeAddress: '2500 South St. Louis Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60623', wardPhone: '(773) 762-1771', wardFax: '(773) 762-1825', email: 'Ward22@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300, Office 30', cityHallPhone: '(312) 744-9491', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/40AA3439-736E-EC11-8F8E-001DD804FDD0.jpg', neighborhoods: ['Little Village', 'South Lawndale', 'North Lawndale'], latitude: 41.84615, longitude: -87.71255 },
  { ward: 23, alderperson: 'Silvana Tabares', wardOfficeAddress: '6247 South Archer Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60638', wardPhone: '(773) 582-4444', wardFax: '(773) 582-3332', email: 'Ward23@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 200, Office 14', cityHallPhone: '(312) 744-6828', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/CD474D9F-F788-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Garfield Ridge', 'Clearing', 'Archer Heights', 'West Elsdon'], latitude: 41.79347, longitude: -87.77626 },
  { ward: 24, alderperson: 'Monique L. Scott', wardOfficeAddress: '1158 South Keeler Street', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60624', wardPhone: '(773) 533-2400', wardFax: null, email: 'ward24@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-6839', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/70A44C5E-5EEE-EC11-BB3B-001DD805196E.jpg', neighborhoods: ['North Lawndale', 'East Garfield Park', 'West Garfield Park'], latitude: 41.86614, longitude: -87.73021 },
  { ward: 25, alderperson: 'Byron Sigcho-Lopez', wardOfficeAddress: '2100 West Cermak Road', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60608', wardPhone: '(773) 523-4100', wardFax: null, email: 'Ward25@cityofchicago.org', website: 'https://www.25thward.org', cityHallAddress: '121 North LaSalle Street, Room 200, Office 11', cityHallPhone: '(312) 744-0209', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/9F0FC064-F988-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Pilsen', 'Chinatown', 'South Loop', 'University Village', 'Little Italy'], latitude: 41.85225, longitude: -87.67842 },
  { ward: 26, alderperson: 'Jessica L. Fuentes', wardOfficeAddress: '2511 West Division Street', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60602', wardPhone: '(773) 395-0143', wardFax: null, email: 'Ward26@cityofchicago.org', website: null, cityHallAddress: '121 N. La Salle St. Room 200', cityHallPhone: '(312) 744-6853', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/85DA45DD-6BF3-ED11-A7C6-001DD804FC2B.jpg', neighborhoods: ['Humboldt Park', 'West Town', 'Ukrainian Village', 'Noble Square'], latitude: 41.90288, longitude: -87.68994 },
  { ward: 27, alderperson: 'Walter R. Burnett', wardOfficeAddress: '4 North Western Avenue, Unit 1C', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60618', wardPhone: '(312) 432-1995', wardFax: '(312) 432-1049', email: 'Ward27@cityofchicago.org', website: 'http://aldermanburnett.com/', cityHallAddress: '121 North LaSalle Street, Room 300, Office 38', cityHallPhone: '(312) 744-6124', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/81F21A0D-F16E-F011-BEC1-001DD8096BE6.jpg', neighborhoods: ['West Loop', 'Near West Side', 'Fulton Market', 'East Garfield Park'], latitude: 41.88127, longitude: -87.68658 },
  { ward: 28, alderperson: 'Jason C. Ervin', wardOfficeAddress: '2622 West Jackson Boulevard, Suite 200A', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60612', wardPhone: '(773) 533-0900', wardFax: '(773) 522-9842', email: 'Ward28@cityofchicago.org', website: 'http://www.AldermanErvin.com/', cityHallAddress: '121 North LaSalle Street, Room 200, Office 18', cityHallPhone: '(312) 744-3066', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/C5C5987A-FC88-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Austin', 'West Garfield Park', 'Near West Side'], latitude: 41.87759, longitude: -87.69232 },
  { ward: 29, alderperson: 'Chris Taliaferro', wardOfficeAddress: '6272 West North Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60639', wardPhone: '(773) 237-6460', wardFax: '(773) 237-6418', email: 'Ward29@cityofchicago.org', website: 'http://www.aldtaliaferro.com', cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-8805', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/F113CA93-FC88-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Austin', 'Belmont Cragin', 'Galewood'], latitude: 41.90928, longitude: -87.78300 },
  { ward: 30, alderperson: 'Ruth Cruz', wardOfficeAddress: '5418 W. Belmont Ave', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60641', wardPhone: '(773) 628-7874', wardFax: null, email: 'Ward30@cityofchicago.org', website: null, cityHallAddress: '121 N. LaSalle St. Room 200', cityHallPhone: '(312) 744-3304', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/C7422EFD-6BF3-ED11-A7C6-001DD804FC2B.jpg', neighborhoods: ['Belmont Cragin', 'Hermosa', 'Portage Park'], latitude: 41.93874, longitude: -87.76237 },
  { ward: 31, alderperson: 'Felix Cardona Jr.', wardOfficeAddress: '4606 West Diversey Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60639', wardPhone: '(773) 824-2000', wardFax: '(773) 826-2006', email: 'Ward31@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 200, Office 19', cityHallPhone: '(312) 744-6102', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/1C8E86C8-FB88-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Belmont Cragin', 'Hermosa', 'Kelvyn Park', 'Logan Square'], latitude: 41.93170, longitude: -87.74223 },
  { ward: 32, alderperson: 'Scott Waguespack', wardOfficeAddress: '2657 North Clybourn Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60614', wardPhone: '(773) 248-1330', wardFax: '(773) 248-1360', email: 'Ward32@cityofchicago.org', website: 'http://www.ward32.org', cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-6567', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/239D3A1D-FA88-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Bucktown', 'Wicker Park', 'Roscoe Village', 'North Center'], latitude: 41.93003, longitude: -87.67533 },
  { ward: 33, alderperson: 'Rossana Rodriguez Sanchez', wardOfficeAddress: '4747 North Sawyer Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60625', wardPhone: '(773) 840-7880', wardFax: null, email: 'Ward33@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-3373', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/176937CC-9378-EC11-8940-001DD804DD33.jpg', neighborhoods: ['Albany Park', 'Irving Park', 'North Park', 'Ravenswood'], latitude: 41.96801, longitude: -87.70954 },
  { ward: 34, alderperson: 'William Conway', wardOfficeAddress: '121 North LaSalle Street, Room 300', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60602', wardPhone: '(312) 744-6820', wardFax: null, email: 'Ward34@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-6820', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/4C380420-6CF3-ED11-A7C6-001DD804FC2B.jpg', neighborhoods: ['South Loop', 'Loop', 'Near South Side', 'Dearborn Park'], latitude: 41.88376, longitude: -87.63228 },
  { ward: 35, alderperson: 'Anthony J. Quezada', wardOfficeAddress: '2934 North Milwaukee Avenue, Unit C', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60618', wardPhone: '(773) 887-3772', wardFax: null, email: 'ward35@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-6835', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/A32C8E68-7415-F011-9989-001DD806C140.jpg', neighborhoods: ['Avondale', 'Logan Square', 'Hermosa', 'Irving Park'], latitude: 41.93448, longitude: -87.71651 },
  { ward: 36, alderperson: 'Gilbert Villegas', wardOfficeAddress: '6560 West Fullerton Avenue, Unit C118, Suite A', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60707', wardPhone: '(773) 745-4636', wardFax: null, email: 'Ward36@cityofchicago.org', website: 'http://www.36thward.org', cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-4324', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/9E0A3436-FB88-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Belmont Cragin', 'Montclare', 'Galewood', 'Portage Park'], latitude: 41.92375, longitude: -87.78988 },
  { ward: 37, alderperson: 'Emma Mitts', wardOfficeAddress: '4924 West Chicago Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60651', wardPhone: '(773) 379-0960', wardFax: '(773) 773-0966', email: 'Ward37@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300, Office 45', cityHallPhone: '(312) 744-8019', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/970B1AB5-FA88-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Austin', 'West Humboldt Park', 'Belmont Cragin'], latitude: 41.89509, longitude: -87.74929 },
  { ward: 38, alderperson: 'Nicholas Sposato', wardOfficeAddress: '3821 North Harlem Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60634', wardPhone: '(773) 283-3838', wardFax: '(773) 283-3235', email: 'Ward38@cityofchicago.org', website: 'http://aldermansposato.com/', cityHallAddress: '121 North LaSalle Street, Room 200, Office 2', cityHallPhone: '(312) 744-6857', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/40781120-F888-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Dunning', 'Montclare', 'Belmont Heights', 'Portage Park'], latitude: 41.94956, longitude: -87.80701 },
  { ward: 39, alderperson: 'Samantha Nugent', wardOfficeAddress: '4200 West Lawrence Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60630', wardPhone: '(773) 736-5594', wardFax: null, email: 'Ward39@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-7242', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/7C82104C-F888-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['North Park', 'Albany Park', 'Mayfair', 'Old Irving Park'], latitude: 41.96829, longitude: -87.73303 },
  { ward: 40, alderperson: 'Andre Vasquez Jr.', wardOfficeAddress: '5620 North Western Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60659', wardPhone: '(773) 654-1867', wardFax: null, email: 'Ward40@cityofchicago.org', website: 'http://www.40thward.org', cityHallAddress: '121 North LaSalle Street, Room 200', cityHallPhone: '(312) 744-6858', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/9DB0248A-F988-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['West Ridge', 'Lincoln Square', 'Bowmanville', 'Budlong Woods'], latitude: 41.98382, longitude: -87.68961 },
  { ward: 41, alderperson: 'Anthony V. Napolitano', wardOfficeAddress: '7231 West Touhy Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60631', wardPhone: '(773) 631-2241', wardFax: '(773) 631-2479', email: 'Ward41@cityofchicago.org', website: 'http://www.chicago41.com', cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-3942', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/55B86EA2-F988-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Edison Park', 'Norwood Park', "O'Hare", 'Forest Glen'], latitude: 42.01158, longitude: -87.80791 },
  { ward: 42, alderperson: 'Brendan Reilly', wardOfficeAddress: '121 North LaSalle Street, Room 200, Office 6', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60602', wardPhone: '(312) 642-4242', wardFax: '(312) 642-0420', email: 'Ward42@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 200, Office 6', cityHallPhone: '(312) 642-4242', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/DE5B6D97-FC72-EC11-8F8E-001DD804F74D.jpg', neighborhoods: ['Loop', 'Near North Side', 'River North', 'Magnificent Mile', 'Streeterville'], latitude: 41.88376, longitude: -87.63228 },
  { ward: 43, alderperson: 'Timothy R. Knudsen', wardOfficeAddress: '2523 North Halsted Street', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60614', wardPhone: '(773) 348-9500', wardFax: '(773) 348-9594', email: 'Ward43@cityofchicago.org', website: 'https://ward43.org', cityHallAddress: '121 North LaSalle Street, Room 200', cityHallPhone: '(312) 744-3071', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/75B69F92-D740-ED11-9DAF-001DD8309496.jpg', neighborhoods: ['Lincoln Park', 'Old Town', 'Near North Side', 'Gold Coast'], latitude: 41.92804, longitude: -87.64871 },
  { ward: 44, alderperson: 'Bennett R. Lawson', wardOfficeAddress: '3223 North Sheffield Avenue, Suite A', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60657', wardPhone: '(773) 525-6034', wardFax: null, email: 'Ward44@cityofchicago.org', website: null, cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-3073', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/1628D550-6CF3-ED11-A7C6-001DD804FC2B.jpg', neighborhoods: ['Lakeview', 'Wrigleyville', 'Boystown', 'East Lakeview'], latitude: 41.94063, longitude: -87.65398 },
  { ward: 45, alderperson: 'James M. Gardiner', wardOfficeAddress: '5460 N. Milwaukee Ave', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60630', wardPhone: '(773) 853-0799', wardFax: null, email: 'Ward45@cityofchicago.org', website: 'http://www.aldermangardiner.com', cityHallAddress: '121 North LaSalle Street, Room 200', cityHallPhone: '(312) 744-6841', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/A29D73BA-F988-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Jefferson Park', 'Portage Park', 'Forest Glen', 'Gladstone Park'], latitude: 41.98073, longitude: -87.77254 },
  { ward: 46, alderperson: 'Angela Clay', wardOfficeAddress: '4544 North Broadway', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60640', wardPhone: '(312) 744-6831', wardFax: null, email: 'Ward46@cityofchicago.org', website: null, cityHallAddress: '121 N. La Salle Room 200', cityHallPhone: '(312) 744-6831', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/5F4C907D-6CF3-ED11-A7C6-001DD804FC2B.jpg', neighborhoods: ['Uptown', 'Buena Park', 'Sheridan Park', 'Graceland West'], latitude: 41.96481, longitude: -87.65726 },
  { ward: 47, alderperson: 'Matthew J. Martin', wardOfficeAddress: '4243 North Lincoln Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60618', wardPhone: '(773) 868-4747', wardFax: null, email: 'Ward47@cityofchicago.org', website: 'http://www.aldermanmartin.com', cityHallAddress: '121 North LaSalle Street, Room 200, Office 7', cityHallPhone: '(312) 744-4021', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/A218F4F8-F988-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Lincoln Square', 'North Center', 'Ravenswood', 'Lakeview'], latitude: 41.95894, longitude: -87.68195 },
  { ward: 48, alderperson: 'Leni Manaa-Hoppenworth', wardOfficeAddress: '1129 W. Bryn Mawr Ave.', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60660', wardPhone: '(773) 784-5277', wardFax: null, email: 'info@the48thward.org', website: 'https://www.the48thward.org/', cityHallAddress: '121 N. La Salle St. Room 300', cityHallPhone: '(312) 744-6834 / (312) 744-6860', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/561B99CA-6CF3-ED11-A7C6-001DD804FC2B.jpg', neighborhoods: ['Edgewater', 'Andersonville', 'Magnolia Glen', 'Lakewood Balmoral'], latitude: 41.98353, longitude: -87.65924 },
  { ward: 49, alderperson: 'Maria E. Hadden', wardOfficeAddress: '1447 West Morse Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60626', wardPhone: '(773) 338-5796', wardFax: null, email: 'Ward49@cityofchicago.org', website: 'http://www.49thward.org', cityHallAddress: '121 North LaSalle Street, Room 300', cityHallPhone: '(312) 744-3067', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/124700E1-FB88-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['Rogers Park', 'West Ridge', 'Loyola'], latitude: 42.00777, longitude: -87.66777 },
  { ward: 50, alderperson: 'Debra L. Silverstein', wardOfficeAddress: '2949 West Devon Avenue', wardOfficeCity: 'Chicago', wardOfficeState: 'IL', wardOfficeZip: '60659', wardPhone: '(773) 262-1050', wardFax: '(773) 381-2970', email: 'Ward50@cityofchicago.org', website: 'http://50thwardchicago.com', cityHallAddress: '121 North LaSalle Street, Room 300, Office 24', cityHallPhone: '(312) 744-6855', photoUrl: 'https://occprodstoragev1.blob.core.usgovcloudapi.net/council-profile-pictures/0F96F023-FB88-EC11-8D20-001DD804FD38.jpg', neighborhoods: ['West Ridge', 'Peterson Park', 'Arcadia Terrace', 'Budlong Woods'], latitude: 41.99737, longitude: -87.70403 },
]

// ─── Per-ward population (2023 ACS 5-Year Estimates) ────────────────────────
// Source: https://data.cityofchicago.org/resource/k5pk-wpt9.json
// Dataset: "ACS 5 Year Data by Ward - Most Recent Year"
// Last verified: 2026-02-20
const WARD_POPULATION: Record<number, number> = {
  1: 56174, 2: 58472, 3: 55444, 4: 51937, 5: 47372,
  6: 44400, 7: 40616, 8: 48995, 9: 46727, 10: 54702,
  11: 55137, 12: 57228, 13: 52402, 14: 53443, 15: 35489,
  16: 44836, 17: 43957, 18: 58441, 19: 50309, 20: 50578,
  21: 50510, 22: 45729, 23: 55533, 24: 42400, 25: 55618,
  26: 47546, 27: 67920, 28: 59517, 29: 58887, 30: 50480,
  31: 49480, 32: 57919, 33: 55047, 34: 46071, 35: 51126,
  36: 50539, 37: 54701, 38: 56225, 39: 60193, 40: 62103,
  41: 61563, 42: 72572, 43: 53945, 44: 55020, 45: 56873,
  46: 46849, 47: 60434, 48: 45103, 49: 52797, 50: 60444,
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getWardRecord(wardNumber: number): WardDataRecord | undefined {
  return CHICAGO_WARDS.find(w => w.ward === wardNumber)
}

export function searchWards(query: string): WardDataRecord[] {
  const q = query.toLowerCase()
  return CHICAGO_WARDS.filter(w =>
    w.alderperson.toLowerCase().includes(q) ||
    w.neighborhoods.some(n => n.toLowerCase().includes(q)) ||
    w.ward.toString() === q
  )
}

/**
 * Convert a WardDataRecord into the full Ward shape used by UI components.
 * Meetings/initiatives/budget are placeholders until live data is wired up.
 */
export function toWard(record: WardDataRecord): Ward {
  return {
    id: record.ward,
    name: `Ward ${record.ward}`,
    alderman: {
      id: `alderman-${record.ward}`,
      name: record.alderperson,
      title: 'Alderperson',
      email: record.email,
      phone: record.wardPhone,
      photoUrl: record.photoUrl ?? undefined,
      website: record.website ?? undefined,
      socialMedia: {},
      biography: '',
      termStart: '2023-05-15',
      termEnd: '2027-05-15',
      committees: [],
    },
    neighborhoods: record.neighborhoods,
    population: WARD_POPULATION[record.ward] ?? 54000,
    demographics: {
      totalPopulation: WARD_POPULATION[record.ward] ?? 54000,
      medianIncome: 0,
      povertyRate: 0,
      educationLevel: { highSchoolOrHigher: 0, bachelorsOrHigher: 0, graduateDegree: 0 },
      ageDistribution: { under18: 0, age18to34: 0, age35to64: 0, over65: 0 },
      racialBreakdown: { white: 0, black: 0, hispanic: 0, asian: 0, other: 0 },
    },
    office: {
      address: `${record.wardOfficeAddress}, ${record.wardOfficeCity}, ${record.wardOfficeState} ${record.wardOfficeZip}`,
      phone: record.wardPhone,
      email: record.email,
      hours: 'Mon-Fri: 9:00 AM - 5:00 PM',
      location: { lat: record.latitude, lng: record.longitude },
    },
    meetings: [],
    initiatives: [],
    budget: { totalBudget: 0, allocated: 0, spent: 0, categories: [] },
    boundaries: {},
  }
}

/**
 * All 50 wards converted to UI Ward objects.
 */
export const ALL_WARDS: Ward[] = CHICAGO_WARDS.map(toWard)

/**
 * Data source URLs — use these for automated refresh.
 */
export const DATA_SOURCES = {
  wardOfficesApi: 'https://data.cityofchicago.org/resource/htai-wnw4.json',
  wardPopulationApi: 'https://data.cityofchicago.org/resource/k5pk-wpt9.json',
  wardsPage: 'https://www.chicago.gov/city/en/about/wards.html',
  wardDetail: (n: number) => `https://www.chicago.gov/city/en/about/wards/${String(n).padStart(2, '0')}.html`,
  boardOfElections: 'https://chicagoelections.gov/districts-maps/ward-maps-electeds',
  councilmatic: 'https://chicago.councilmatic.org/council-members/',
}
