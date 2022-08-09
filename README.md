# shotgun
Node js website screenshot to get a state check of client websites.

## Requirements
Node.js 16.16.0+

## Setup
`npm i`
Add a CSV file called `urls.csv` with the urls you would like to snapshot (must be first column).
Hint: I used Screaming Frog to generate url lists for my clients.

## Run application
`node index.js --directory ./clients/MY_CLIENT

## Options
Required: --directory [string]

Optional: --max_urls [number] # use this to do a couple captures as a test trial before grabbing the whole site
