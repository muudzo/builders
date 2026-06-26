import { Module } from '@nestjs/common';
import { PermitsModule } from '../permits/permits.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaynowService } from './paynow.service';

@Module({
  imports: [PermitsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaynowService],
})
export class PaymentsModule {}
