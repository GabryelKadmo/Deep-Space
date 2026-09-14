import { env } from '$env/dynamic/public';

/**
 * Endpoint do relay usado pelo compartilhamento de workspace. O padrao ainda
 * aponta para o relay publico do projeto original; defina PUBLIC_RELAY_URL para
 * usar o seu. O servidor esta em packages/orkestrai-relay, com Dockerfile e
 * docker-compose de producao prontos.
 */
export const DEFAULT_RELAY_URL = env.PUBLIC_RELAY_URL || 'wss://relay.orkestrai.app/v1/connect';
