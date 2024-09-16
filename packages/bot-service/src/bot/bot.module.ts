import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { RedisService } from '../redis/redis.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Chains,
  ChainSchema,
  ContractDetails,
  ContractDetailSchema,
  Erc20Balances,
  Erc20BalanceSchema,
  NftBalances,
  NftBalanceSchema,
  Transactions,
  TransactionSchema,
  Users,
  UserSchema,
  Wallets,
  WalletSchema,
} from '@app/shared/models';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chains.name, schema: ChainSchema },
      { name: Transactions.name, schema: TransactionSchema },
      { name: Users.name, schema: UserSchema },
      { name: Wallets.name, schema: WalletSchema },
      { name: ContractDetails.name, schema: ContractDetailSchema },
      { name: Erc20Balances.name, schema: Erc20BalanceSchema },
      { name: NftBalances.name, schema: NftBalanceSchema },
    ]),
  ],
  providers: [BotService, RedisService],
})
export class BotModule {}
