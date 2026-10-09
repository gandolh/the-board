# brief-board

brief-board is one Jira-style board for every corpus brief across
`~/projects`: a lane per project, six columns, and a ticket for each brief that
shows where the work stands. Agents read and move tickets with the
`brief-board` command; the owner watches the board in a browser and does the
two moves that are theirs (testing and deploying). The corpus in each project
stays the source of truth: the board adds who is on what and what is waiting
for the owner, and loses nothing if it is down. The design is in
[corpus/wiki/](corpus/wiki/).

## Owner setup
