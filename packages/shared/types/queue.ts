// SPDX-License-Identifier: MIT

// Job channels
export const QUEUE_METADATA = 'metadata';

// onchain Job Channels
export const ONCHAIN_QUEUES = {
  QUEUE_MINT_20: 'QUEUE_MINT_20',
  QUEUE_BURN_20: 'QUEUE_BURN_20',
  QUEUE_TRANSFER_20: 'QUEUE_TRANSFER_20',
  QUEUE_MINT_721: 'QUEUE_MINT_721',
  QUEUE_BURN_721: 'QUEUE_BURN_721',
  QUEUE_TRANSFER_721: 'QUEUE_TRANSFER_721',
  QUEUE_MINT_1155: 'QUEUE_MINT_1155',
  QUEUE_BURN_1155: 'QUEUE_BURN_1155',
  QUEUE_TRANSFER_1155: 'QUEUE_TRANSFER_1155',
};

// job type
export const JOB_QUEUE_NFT_METADATA = 'fetch_metadata';

// onchain jobs
export const ONCHAIN_JOBS = {
  JOB_MINT_20: 'JOB_MINT_20',
  JOB_BURN_20: 'JOB_BURN_20',
  JOB_TRANSFER_20: 'JOB_TRANSFER_20',
  JOB_MINT_721: 'JOB_MINT_721',
  JOB_BURN_721: 'JOB_BURN_721',
  JOB_TRANSFER_721: 'JOB_TRANSFER_721',
  JOB_MINT_1155: 'JOB_MINT_1155',
  JOB_BURN_1155: 'JOB_BURN_1155',
  JOB_TRANSFER_1155: 'JOB_TRANSFER_1155',
};

export const MQ_JOB_DEFAULT_CONFIG = {
  removeOnComplete: true,
  removeOnFail: {
    count: 1000, // keep up to 1000 jobs
  },
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
};
