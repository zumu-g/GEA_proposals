# Get everypropertyAI API Token

## Status

**Variable Found:** `EVERYPROPERTY_API_KEYS` in the `GEA_everypropertyAI` Railway project  
**Current Status:** Token appears valid but needs full value copied from Dashboard (CLI truncates display)

## Get Full Token (Manual)

1. Go to **https://railway.app**
2. Select workspace: **zumu-g's Projects**
3. Open project: **GEA_everypropertyAI**
4. Click **Variables** (top menu)
5. Find the variable: **EVERYPROPERTY_API_KEYS**
6. Click the value to reveal full text
7. Copy the **first key** (format: `epai_...`)
8. Paste into proposals `.env`:
   ```
   EVERYPROPERTY_API_TOKEN=epai_[full-key-here]
   ```
9. Save and restart: `npm run dev`

## If Token Is Expired

1. In Railway Variables, click the key to rotate/regenerate
2. Copy the new value
3. Update proposals `.env`
4. Restart dev server

## What's Stored

**Variable:** `EVERYPROPERTY_API_KEYS`  
**Contains:** Two keys (proposal API key + CRM key), comma-separated  
**Use:** First key for proposal lookups (starts with `epai_`)
