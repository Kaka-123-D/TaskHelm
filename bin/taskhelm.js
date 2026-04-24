#!/usr/bin/env node

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.TASKHELM_PACKAGE_ROOT ??= resolve(dirname(fileURLToPath(import.meta.url)), '..')

import('@taskhelm/cli')
  .then(({ main }) => main(process.argv, { launchAppByDefault: true }))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
