#!/usr/bin/env node
import { main } from '../src/index.js'

await main(process.argv, { launchAppByDefault: false })
