import { Controller, Post, UseGuards } from "@nestjs/common";
import { ExpirationService } from "./expiration.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("expiration")
export class ExpirationController {
  constructor(private readonly expirationService: ExpirationService) {}

  @Post("run-manual")
  @UseGuards(JwtAuthGuard)
  async runManual() {
    const result = await this.expirationService.processExpiredInventory();
    return {
      message: "Evaluación de caducidad ejecutada manualmente",
      ...result,
    };
  }
}