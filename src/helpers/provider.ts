import providers, { providerLocal } from '../ci_providers'
import { info, logError, verbose } from '../helpers/logger'
import { IServiceParams, UploaderInputs } from '../types'

export function detectProvider(inputs: UploaderInputs): IServiceParams {
  const { args, environment } = inputs
  let serviceParams = undefined

  //   check if we have a complete set of manual overrides (slug, SHA)
  if (args.sha && args.slug) {
    // We have the needed args for a manual override
    info(
      `Using manual override from args. CI Provider detection will not be ran.`,
    )
    serviceParams = {
      branch: '',
      build: '',
      buildURL: '',
      commit: args.sha,
      job: '',
      pr: 0,
      service: 'manual',
      slug: args.slug,
    }
    return serviceParams
  }

  //   if not, loop though all providers (except local)
  for (const provider of providers) {
    if (provider.detect(environment)) {
      info(`Detected ${provider.getServiceName()} as the CI provider.`)
      verbose('-> Using the following env variables:', Boolean(args.verbose))
      for (const envVarName of provider.getEnvVarNames()) {
        verbose(
          `     ${envVarName}: ${environment[envVarName]}`,
          Boolean(args.verbose),
        )
      }
      return provider.getServiceParams(inputs)
    }
  }

  //   If not matched, but CI=true, try local with the values for service set to Generic CI
  if (environment['CI']) {
    info(`Using Generic CI as the CI provider.`)
    serviceParams = providerLocal.getServiceParams(inputs)
    // the service name must be in the list of accepted names on the server.
    serviceParams.service = 'custom'
    return serviceParams
  }
  //   if fails, run local normally
  try {
    info(`Tying ${providerLocal.getServiceName()} as the CI provider.`)
    if (providerLocal.detect(environment)) {
      return providerLocal.getServiceParams(inputs)
    }
  } catch (error) {
    //   if fails, display message explaining failure, and explaining that SHA and slug need to be set as args
    if (!serviceParams) {
      logError(`Errow detecting repos setting using git: ${error}`)
      throw new Error(
        'Unable to detect service, please specify sha and slug manually.\nYou can do this by passing the values with the `-S` and `-r` flags.\nSee the `-h` flag for more details.',
      )
    }
  }
  throw new Error(`There was an unknown error with provider detection`)
}
