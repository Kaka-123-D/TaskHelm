#!/usr/bin/env node

import('@taskhelm/cli')
  .then(({ main }) => main(process.argv, { launchAppByDefault: true }))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
