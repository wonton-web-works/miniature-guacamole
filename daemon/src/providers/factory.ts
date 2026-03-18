// Factory function that creates the appropriate TicketProvider based on config
// WS-DAEMON-10: Ticket Provider Abstraction Layer

import type { DaemonConfig } from '../types';
import type { TicketProvider } from './types';
import { JiraProvider } from './jira';
import { LinearProvider } from './linear';
import { GitHubProvider } from './github';

/**
 * Creates and returns the TicketProvider for the configured provider.
 * Only the active provider's config section is used; others are ignored.
 *
 * @throws Error if the active provider's config section is missing
 * @throws Error if the provider value is not recognized
 */
export function createProvider(config: DaemonConfig): TicketProvider {
  switch (config.provider) {
    case 'jira': {
      if (!config.jira) {
        throw new Error(
          'config.jira is required when provider is "jira". Add a jira section to your .mg-daemon.json.'
        );
      }
      return new JiraProvider(config.jira, config.polling);
    }

    case 'linear': {
      if (!config.linear) {
        throw new Error(
          'config.linear is required when provider is "linear". Add a linear section to your .mg-daemon.json.'
        );
      }
      return new LinearProvider(config.linear);
    }

    case 'github': {
      if (!config.github?.repo) {
        throw new Error('config.github.repo is required when provider is "github".');
      }
      return new GitHubProvider(config.github);
    }

    default: {
      const exhaustiveCheck: never = config.provider;
      throw new Error(`Unknown ticket provider: "${exhaustiveCheck}". Valid values: jira, linear, github`);
    }
  }
}
