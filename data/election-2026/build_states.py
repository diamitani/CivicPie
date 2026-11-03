#!/usr/bin/env python3
"""Build data/seed/election_2026_states.json — Election Day facts for all 50 states + DC.

Every field below was transcribed from these public sources on 2026-11-03:

  HOURS + POLLING-PLACE LOOKUP  Ballotpedia, "State Poll Opening and Closing Times (2026)"
      https://ballotpedia.org/State_Poll_Opening_and_Closing_Times_(2026)
      (cross-checked against NCSL "Polling Places" statute table:
       https://www.ncsl.org/elections-and-campaigns/polling-places)
  MAIL BALLOT RETURN DEADLINES  Ballotpedia, "Absentee/mail-in ballot return deadlines, 2026"
      (Nov. 3, 2026 general-election table; each row cites the state's own calendar)
      https://ballotpedia.org/Absentee/mail-in_ballot_return_deadlines,_2026
  ELECTION DAY REGISTRATION     NCSL, "Voter Registration Deadlines" + "Same-Day Voter Registration"
      https://www.ncsl.org/elections-and-campaigns/voter-registration-deadlines
      https://www.ncsl.org/elections-and-campaigns/same-day-voter-registration
  2026 REDISTRICTING            Wikipedia, "2026 United States House of Representatives elections"
      (redistricting table: states with "New districts enacted" for 2026)

Run:  python3 data/election-2026/build_states.py
"""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "seed" / "election_2026_states.json"

# abbr: (name, hours, notes, polling_place_url)
HOURS = {
    "AL": ("Alabama", "7 a.m. to 7 p.m.", "Most of Alabama is on Central time; localities on Eastern time may open 7 a.m. ET and close 7 p.m. ET.", "https://myinfo.alabamavotes.gov/VoterView"),
    "AK": ("Alaska", "7 a.m. to 8 p.m.", "Alaska is divided between the Alaska and Hawaii-Aleutian time zones.", "https://www.elections.alaska.gov/election-polls/"),
    "AZ": ("Arizona", "6 a.m. to 7 p.m.", "", "https://my.arizona.vote/WhereToVote.aspx?s=address"),
    "AR": ("Arkansas", "7:30 a.m. to 7:30 p.m.", "", "https://www.voterview.ar-nova.org/voterview"),
    "CA": ("California", "7 a.m. to 8 p.m.", "California conducts its elections largely by mail.", "https://www.sos.ca.gov/elections/polling-place"),
    "CO": ("Colorado", "7 a.m. to 7 p.m.", "Colorado conducts its elections largely by mail.", "https://www.sos.state.co.us/pubs/elections/VIP.html"),
    "CT": ("Connecticut", "6 a.m. to 8 p.m.", "", "https://portaldir.ct.gov/sots/LookUp.aspx"),
    "DE": ("Delaware", "7 a.m. to 8 p.m.", "", "https://ivote.de.gov/VoterView"),
    "DC": ("District of Columbia", "7 a.m. to 8 p.m.", "D.C. conducts its elections largely by mail.", "https://dcgis.maps.arcgis.com/apps/instant/nearby/index.html?appid=763576faa0b1470ca0559c377cf3b497&sliderDistance=1"),
    "FL": ("Florida", "7 a.m. to 7 p.m.", "Florida is divided between the Eastern and Central time zones.", "https://dos.fl.gov/elections/for-voters/check-your-voter-status-and-polling-place/voter-precinct-lookup/"),
    "GA": ("Georgia", "7 a.m. to 7 p.m.", "", "https://mvp.sos.ga.gov/s/"),
    "HI": ("Hawaii", "7 a.m. to 7 p.m.", "Hawaii conducts its elections largely by mail; voter service centers are open on Election Day.", "https://elections.hawaii.gov/voter-service-centers-and-places-of-deposit/"),
    "ID": ("Idaho", "8 a.m. to 8 p.m.", "Polling places may open at 7 a.m. at the county clerk's discretion. Idaho is divided between the Mountain and Pacific time zones.", "https://votertools.voteidaho.gov/TEDElectionLink/VoterServices/voter/where-do-I-vote"),
    "IL": ("Illinois", "6 a.m. to 7 p.m.", "", "https://ova.elections.il.gov/PollingPlaceLookup.aspx"),
    "IN": ("Indiana", "6 a.m. to 6 p.m.", "Indiana is divided between the Eastern and Central time zones.", "https://indianavoters.in.gov/"),
    "IA": ("Iowa", "7 a.m. to 8 p.m.", "", "https://apps.sos.iowa.gov/elections/voterreg/pollingplace/search.aspx"),
    "KS": ("Kansas", "7 a.m. to 7 p.m.", "Unless the county sets other hours: 7 a.m.–7 p.m. Central (6 a.m.–6 p.m. Mountain). Counties may open as early as 6 a.m. and close as late as 8 p.m. Central.", "https://kansasvoterinfo.gov/VoterView"),
    "KY": ("Kentucky", "6 a.m. to 6 p.m.", "Kentucky is divided between the Eastern and Central time zones.", "https://elect.ky.gov/Voters/Pages/Polling-Locations.aspx"),
    "LA": ("Louisiana", "6 a.m. to 8 p.m.", "Tuesday elections run 6 a.m.–8 p.m.", "https://voterportal.sos.la.gov/"),
    "ME": ("Maine", "6 a.m. to 8 p.m.", "Opening time varies by town (6–8 a.m.; up to 10 a.m. in towns under 500 people). All polls close at 8 p.m.", "https://www.maine.gov/portal/government/edemocracy/voter_lookup.php"),
    "MD": ("Maryland", "7 a.m. to 8 p.m.", "", "https://elections.maryland.gov/voting/where.html"),
    "MA": ("Massachusetts", "7 a.m. to 8 p.m.", "Municipalities may open as early as 5:45 a.m.", "https://www.sec.state.ma.us/WhereDoIVoteMA/WhereDoIVote"),
    "MI": ("Michigan", "7 a.m. to 8 p.m.", "Michigan is divided between the Eastern and Central time zones.", "https://mvic.sos.state.mi.us/Voter/Index"),
    "MN": ("Minnesota", "7 a.m. to 8 p.m.", "Towns with fewer than 500 residents may open as late as 10 a.m.", "https://pollfinder.sos.mn.gov/"),
    "MS": ("Mississippi", "7 a.m. to 7 p.m.", "", "https://myelectionday.sos.state.ms.us/VoterOutreach/Pages/VOSearch.aspx"),
    "MO": ("Missouri", "6 a.m. to 7 p.m.", "", "https://voteroutreach.sos.mo.gov/portal/"),
    "MT": ("Montana", "7 a.m. to 8 p.m.", "Polling places with fewer than 400 in-person voters must be open at least noon–8 p.m.", "https://voterportal.mt.gov/WhereToVote.aspx"),
    "NE": ("Nebraska", "8 a.m. to 8 p.m. Central / 7 a.m. to 7 p.m. Mountain", "Nebraska is divided between the Central and Mountain time zones.", "https://www.votercheck.necvr.ne.gov/voterview/"),
    "NV": ("Nevada", "7 a.m. to 7 p.m.", "Nevada conducts its elections largely by mail.", "https://www.nvsos.gov/votersearch/"),
    "NH": ("New Hampshire", "Varies by town", "Polls must open by 11 a.m. and cannot close before 7 p.m.", "https://app.sos.nh.gov/voterinformation"),
    "NJ": ("New Jersey", "6 a.m. to 8 p.m.", "", "https://voter.svrs.nj.gov/polling-place-search"),
    "NM": ("New Mexico", "7 a.m. to 7 p.m.", "", "https://voterportal.servis.sos.state.nm.us/WhereToVote.aspx"),
    "NY": ("New York", "6 a.m. to 9 p.m.", "", "https://voterlookup.elections.ny.gov/"),
    "NC": ("North Carolina", "6:30 a.m. to 7:30 p.m.", "", "https://vt.ncsbe.gov/pplkup/"),
    "ND": ("North Dakota", "Open 7–9 a.m.; close 7–9 p.m.", "Hours are set locally within that window. North Dakota is divided between the Central and Mountain time zones.", "https://vip.sos.nd.gov/wheretovote.aspx"),
    "OH": ("Ohio", "6:30 a.m. to 7:30 p.m.", "", "https://www.ohiosos.gov/directories/find-my-polling-location"),
    "OK": ("Oklahoma", "7 a.m. to 7 p.m.", "", "https://okvoterportal.okelections.gov/"),
    "OR": ("Oregon", "Ballots due by 8 p.m.", "Oregon votes by mail. Return your ballot to an official drop box or county elections office by 8 p.m. Oregon is divided between the Mountain and Pacific time zones.", "https://sos.oregon.gov/elections/pages/drop-box-locator.aspx"),
    "PA": ("Pennsylvania", "7 a.m. to 8 p.m.", "", "https://www.pavoterservices.pa.gov/Pages/PollingPlaceInfo.aspx"),
    "RI": ("Rhode Island", "7 a.m. to 8 p.m.", "In New Shoreham, polls open at 9 a.m.", "https://vote.sos.ri.gov/Home/PollingPlaces?ActiveFlag=2"),
    "SC": ("South Carolina", "7 a.m. to 7 p.m.", "", "https://vrems.scvotes.sc.gov/Voter/Login?PageMode=PollingPlace"),
    "SD": ("South Dakota", "7 a.m. to 7 p.m.", "South Dakota is divided between the Central and Mountain time zones.", "https://vip.sdsos.gov/viplogin.aspx"),
    "TN": ("Tennessee", "Opening varies by county; close 7 p.m. Central / 8 p.m. Eastern", "Each county sets its opening time. Polls are open 10–13 consecutive hours.", "https://web.go-vote-tn.elections.tn.gov/"),
    "TX": ("Texas", "7 a.m. to 7 p.m.", "Texas is divided between the Central and Mountain time zones.", "https://goelect.txelections.civixapps.com/ivis-mvp-ui/#/login"),
    "UT": ("Utah", "7 a.m. to 8 p.m.", "Utah conducts its elections largely by mail.", "https://votesearch.utah.gov/voter-search/search/search-by-address/how-and-where-can-i-vote"),
    "VT": ("Vermont", "Open 5–10 a.m. (set by town); close 7 p.m.", "Vermont mails every voter a ballot for general elections.", "https://sos.vermont.gov/elections/voters/polling-places/"),
    "VA": ("Virginia", "6 a.m. to 7 p.m.", "", "https://www.elections.virginia.gov/casting-a-ballot/polling-place-lookup/"),
    "WA": ("Washington", "Voting centers close 8 p.m.", "Washington votes by mail. Ballots must be postmarked or in an official drop box by 8 p.m.", "https://www.sos.wa.gov/elections/voters/voter-registration/drop-box-and-voting-center-locations"),
    "WV": ("West Virginia", "6:30 a.m. to 7:30 p.m.", "", "https://apps.sos.wv.gov/Elections/voter/FindMyPollingPlace"),
    "WI": ("Wisconsin", "7 a.m. to 8 p.m.", "", "https://myvote.wi.gov/en-us/Find-My-Polling-Place"),
    "WY": ("Wyoming", "7 a.m. to 7 p.m.", "", "https://myelectionday.sos.wyo.gov/WYVOTES/Pages/VOSearch.aspx"),
}

# Nov. 3, 2026 general election: (mail return deadline type, mail deadline, in-person return deadline,
#  official state page to confirm — usually the state calendar Ballotpedia cites, otherwise the state election site)
MAIL = {
    "AL": ("Received", "2026-11-03", "2026-11-02", "https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting"),
    "AK": ("Postmarked", "2026-11-03", "2026-11-03", "https://www.elections.alaska.gov/absentee-and-early-voting/"),
    "AZ": ("Received", "2026-11-03", "2026-11-03", "https://azsos.gov/sites/default/files/docs/HB2022-PrimaryDateChange-ElectionCalendar-20260206b.pdf"),
    "AR": ("Received", "2026-11-03", "2026-10-30", "https://www.sos.arkansas.gov/uploads/elections/2026_Election_Calendar_Rev._6-2025_.pdf"),
    "CA": ("Postmarked", "2026-11-03", "2026-11-03", "https://www.sos.ca.gov/elections/upcoming-elections/general-election-november-3-2026/key-dates-deadlines"),
    "CO": ("Received", "2026-11-03", "2026-11-03", "https://www.coloradosos.gov/pubs/elections/calendars/2026ElectionCalendar.pdf"),
    "CT": ("Received", "2026-11-03", "2026-11-02", "https://portal.ct.gov/sots/election-services"),
    "DE": ("Received", "2026-11-03", "2026-11-03", "https://elections.delaware.gov/public/calendar/pdfs/2026ElectionCalendar.pdf"),
    "DC": ("Postmarked", "2026-11-03", "2026-11-03", "https://dcboe.org/elections/2026-elections"),
    "FL": ("Received", "2026-11-03", "2026-11-03", "https://dos.fl.gov/elections/for-voters/election-dates/"),
    "GA": ("Received", "2026-11-03", "2026-11-03", "https://sos.ga.gov/sites/default/files/forms/2026%20Calendar.pdf"),
    "HI": ("Received", "2026-11-03", "2026-11-03", "https://elections.hawaii.gov/about-us/calendar/"),
    "ID": ("Received", "2026-11-03", "2026-11-03", "https://voteidaho.gov/"),
    "IL": ("Postmarked", "2026-11-03", "2026-11-03", "https://www.elections.il.gov/Main/CalendarEventsAll.aspx"),
    "IN": ("Received", "2026-11-03", "2026-11-03", "https://www.in.gov/sos/elections/"),
    "IA": ("Received", "2026-11-03", "2026-11-03", "https://sos.iowa.gov/elections/"),
    "KS": ("Postmarked", "2026-11-03", "2026-11-03", "https://sos.ks.gov/elections/important-election-dates.html"),
    "KY": ("Received", "2026-11-03", "2026-11-03", "https://elect.ky.gov/Resources/Documents/2026%20Election%20Calendar%20Final%20Version%2010_6_2025.pdf"),
    "LA": ("Received", "2026-11-02", "2026-11-02", "https://www.sos.la.gov/media/p31j4zkc/elections-calendar-2026.pdf"),
    "ME": ("Received", "2026-11-03", "2026-11-03", "https://www.maine.gov/sos/elections-voting/absentee-guide"),
    "MD": ("Postmarked", "2026-11-03", "2026-11-03", "https://elections.maryland.gov/elections/2026/2026_Election_Calendar.pdf"),
    "MA": ("Postmarked", "2026-11-03", "2026-11-03", "https://www.sec.state.ma.us/divisions/elections/recent-updates/upcoming-elections.htm"),
    "MI": ("Received", "2026-11-03", "2026-11-03", "https://www.michigan.gov/sos/-/media/Project/Websites/sos/Election-Administrators/Election-Dates.pdf"),
    "MN": ("Received", "2026-11-03", "2026-11-03", "https://www.sos.mn.gov/elections-voting/other-ways-to-vote/vote-early-by-mail/"),
    "MS": ("Postmarked", "2026-11-03", None, "https://www.sos.ms.gov/content/documents/elections/2026%20Elections%20Calendar.pdf"),
    "MO": ("Received", "2026-11-03", "2026-11-03", "https://www.sos.mo.gov/elections/goVoteMissouri/howtovote"),
    "MT": ("Received", "2026-11-03", "2026-11-03", "https://sosmt.gov/elections/"),
    "NE": ("Received", "2026-11-03", "2026-11-03", "https://sos.nebraska.gov/sites/default/files/doc/elections/2026/2026_Election_Calendar.pdf"),
    "NV": ("Postmarked", "2026-11-03", "2026-11-03", "https://www.nvsos.gov/"),
    "NH": ("Received", "2026-11-03", "2026-11-03", "https://www.sos.nh.gov/elections/absentee-ballots"),
    "NJ": ("Postmarked", "2026-11-03", "2026-11-03", "https://www.nj.gov/state/elections/assets/pdf/chrons/2026-chron-general-election-0109.pdf"),
    "NM": ("Received", "2026-11-03", "2026-11-03", "https://www.sos.nm.gov/"),
    "NY": ("Postmarked", "2026-11-03", "2026-11-03", "https://elections.ny.gov/"),
    "NC": ("Received", "2026-11-03", "2026-11-03", "https://www.ncsbe.gov/voting/upcoming-election"),
    "ND": ("Received", "2026-11-03", "2026-11-03", "https://www.sos.nd.gov/elections/voter/voting-north-dakota/how-do-i-vote/absentee-voting"),
    "OH": ("Received", "2026-11-03", "2026-11-03", "https://www.ohiosos.gov/globalassets/publications/election/2026electionscalendar_11x17.pdf"),
    "OK": ("Received", "2026-11-03", "2026-11-02", "https://oklahoma.gov/content/dam/ok/en/elections/dates-and-deadlines/2026-voter-information-calendar.pdf"),
    "OR": ("Postmarked", "2026-11-03", "2026-11-03", "https://sos.oregon.gov/elections/Documents/current-elections-calendar.pdf"),
    "PA": ("Received", "2026-11-03", "2026-11-03", "https://www.pa.gov/agencies/vote"),
    "RI": ("Received", "2026-11-03", "2026-11-03", "https://elections.ri.gov/elections/upcoming-elections"),
    "SC": ("Received", "2026-11-03", "2026-11-03", "https://scvotes.gov/"),
    "SD": ("Received", "2026-11-03", "2026-11-03", "https://sdsos.gov/elections-voting/"),
    "TN": ("Received", "2026-11-03", None, "https://sos.tn.gov/elections/calendar"),
    "TX": ("Postmarked", "2026-11-03", "2026-11-03", "https://www.sos.state.tx.us/elections/voter/important-election-dates.shtml"),
    "UT": ("Received", "2026-11-03", "2026-11-03", "https://vote.utah.gov/wp-content/uploads/2026/01/2026-Utah-Election-Calendar.pdf"),
    "VT": ("Received", "2026-11-03", "2026-11-03", "https://sos.vermont.gov/elections/voters/early-absentee-voting/"),
    "VA": ("Postmarked", "2026-11-03", "2026-11-03", "https://www.elections.virginia.gov/casting-a-ballot/calendars-schedules/upcoming-elections.html"),
    "WA": ("Postmarked", "2026-11-03", "2026-11-03", "https://www.sos.wa.gov/elections/elections-calendar/dates-and-deadlines"),
    "WV": ("Postmarked", "2026-11-03", "2026-11-02", "https://sos.wv.gov/elections/Pages/GoVoteWV.aspx"),
    "WI": ("Received", "2026-11-03", "2026-11-03", "https://elections.wi.gov/sites/default/files/documents/2026_2027%20Election%20Calendar_0.pdf"),
    "WY": ("Received", "2026-11-03", "2026-11-03", "https://sos.wyo.gov/FAQS.aspx?root=ELEC"),
}

AUTOMATIC_MAIL = {"CA", "CO", "HI", "NV", "OR", "UT", "VT", "WA"}

# NCSL: states (plus DC) where you can register AND vote on Election Day itself.
ELECTION_DAY_REGISTRATION = {
    "CA", "CO", "CT", "DC", "HI", "ID", "IL", "IA", "ME", "MD", "MI", "MN", "NV", "NH",
    "UT", "VT", "VA", "WA", "WI", "WY",
}
EDR_NOTES = {
    "ND": ("no_registration", "North Dakota has no voter registration — bring a valid ID showing your name, North Dakota residential address and date of birth."),
    "NM": ("limited", "New Mexico allows registration on Election Day at polling locations for statewide contests; check with your county clerk."),
    "MT": ("check", "Montana's late-registration rules have been litigated; late registration is handled only at your county election office — call ahead."),
    "CT": ("yes", "Connecticut's Election Day registration is at one designated location per town, not at your regular polling place."),
    "MI": ("yes", "In Michigan, register on Election Day at your city or township clerk's office, not at the polling place."),
    "WA": ("yes", "In Washington, register in person at a county voting center through 8 p.m."),
    "NV": ("yes", "Election Day registrants in Nevada vote a provisional ballot."),
    "UT": ("yes", "Election Day registrants in Utah vote a provisional ballot."),
    "VA": ("yes", "Election Day registrants in Virginia vote a provisional ballot."),
    "IL": ("yes", "Illinois \"grace period\" registration runs through Election Day; bring two IDs, one showing your current address."),
}

# Wikipedia redistricting table: "New districts enacted" for 2026.
REDISTRICTED_2026 = {"AL", "CA", "FL", "LA", "NC", "OH", "TN", "TX", "UT"}


def main():
    assert set(HOURS) == set(MAIL), set(HOURS) ^ set(MAIL)
    assert len(HOURS) == 51
    states = {}
    for ab, (name, hours, notes, lookup) in sorted(HOURS.items()):
        mtype, mby, inperson, msrc = MAIL[ab]
        if ab in EDR_NOTES:
            edr, edr_note = EDR_NOTES[ab]
        else:
            edr, edr_note = ("yes" if ab in ELECTION_DAY_REGISTRATION else "no"), ""
        if edr == "yes" and ab not in ELECTION_DAY_REGISTRATION:
            raise SystemExit(f"{ab}: EDR note says yes but not in NCSL list")
        states[ab] = {
            "abbr": ab,
            "name": name,
            "poll_hours": hours,
            "poll_notes": notes,
            "polling_place_url": lookup,
            "mail_voting": "automatic" if ab in AUTOMATIC_MAIL else "on_request",
            "mail_return": {"type": mtype, "deadline": mby, "in_person_deadline": inperson, "official_info_url": msrc},
            "election_day_registration": edr,
            "election_day_registration_note": edr_note,
            "redistricted_2026": ab in REDISTRICTED_2026,
        }
    out = {
        "meta": {
            "election_date": "2026-11-03",
            "generated": "2026-11-03",
            "sources": [
                "https://ballotpedia.org/State_Poll_Opening_and_Closing_Times_(2026)",
                "https://www.ncsl.org/elections-and-campaigns/polling-places",
                "https://ballotpedia.org/Absentee/mail-in_ballot_return_deadlines,_2026",
                "https://www.ncsl.org/elections-and-campaigns/voter-registration-deadlines",
                "https://www.ncsl.org/elections-and-campaigns/same-day-voter-registration",
                "https://en.wikipedia.org/wiki/2026_United_States_House_of_Representatives_elections",
            ],
            "note": "All times are local. Anyone in line when polls close may still vote. "
                    "Your state or county election office is the final authority.",
        },
        "states": states,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"wrote {len(states)} states -> {OUT}")


if __name__ == "__main__":
    main()
