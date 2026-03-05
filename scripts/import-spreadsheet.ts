#!/usr/bin/env tsx

import { promises as fs } from 'fs'
import path from 'path'
import { parseCSV, parseExcel, createProposal, extractPropertySales } from '../src/lib/spreadsheet-parser'
import { saveProposal } from '../src/lib/proposal-generator'

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 4) {
    console.error('Usage: npm run import <client-name> <client-email> <property-address> <spreadsheet-file>')
    process.exit(1)
  }

  const [clientName, clientEmail, propertyAddress, filePath] = args

  try {
    // Read file
    const fullPath = path.resolve(filePath)
    const fileExtension = path.extname(fullPath).toLowerCase().slice(1)
    const fileBuffer = await fs.readFile(fullPath)

    // Parse spreadsheet
    let rows: any[]
    if (fileExtension === 'csv') {
      const text = fileBuffer.toString('utf-8')
      rows = parseCSV(text)
    } else if (['xlsx', 'xls'].includes(fileExtension)) {
      rows = parseExcel(fileBuffer)
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`)
    }

    console.log(`Parsed ${rows.length} rows from spreadsheet`)

    // Extract property sales
    try {
      const sales = extractPropertySales(rows)
      console.log(`Extracted ${sales.length} property sales`)
    } catch (error) {
      console.warn('Warning: Could not extract property sales:', error)
    }

    // Create proposal
    const proposal = createProposal({
      clientName,
      clientEmail,
      propertyAddress,
      spreadsheetRows: rows,
    })

    // Save proposal
    await saveProposal(proposal)

    console.log('\n✅ Proposal created successfully!')
    console.log(`\nProposal ID: ${proposal.id}`)
    console.log(`View at: http://localhost:3000/proposal/${proposal.id}`)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()

