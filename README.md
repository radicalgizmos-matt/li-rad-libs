# li-rad-libs
My LinkedIn feed was boring. I made a tool to make it entertaining.

## Install
- From the Firefox add-ons page here: <https://addons.mozilla.org/en-US/firefox/addon/li-rad-libs/>
- From the Chrome Web Store extensions page here: <https://chromewebstore.google.com/detail/linkedin-feed-rad-libs/eniefhgamcjbaeakamcjnajhfkdpgjcm>
- Download the source code bundle and load the manifest or source directory as a local extension.

## Setup
- Click the extension or enter the extenson management menu
- Open the extension preferences/options
- Enter your substitutions
  - The rate determines the probability that a target will be replaced based on the configured percentage (100 to always replace a match)
  - Case-sensitivity because it was an easy QOL implementation
  - Whole word only, so we match "AI" on "10x AI zealot" and not on "That's not fair."
  - You can enter any number of substitution options per target (newline-separated). They have equal probability for usage.
- Click the "Save" button

## Operation
Refresh your feed after saving any substitutions to ensure they are applied. Substitutions affect poster titles, post content, commenter titles and comments.

## Misc
Currently V1 and just a hobby project so there will be bugs...