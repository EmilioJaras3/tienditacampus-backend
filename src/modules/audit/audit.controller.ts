import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("audit")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("my-activity")
  getMyActivity(@CurrentUser() user: { userId: string }) {
    return this.auditService.findByUser(user.userId);
  }

  @Get("recent")
  @Roles("admin")
  getRecent(@Query("limit") limit?: string) {
    return this.auditService.getRecent(limit ? parseInt(limit) : 50);
  }

  @Get("search")
  @Roles("admin")
  searchByMetadata(@Query("key") key: string, @Query("value") value: string) {
    return this.auditService.findByMetadataKey(key, value);
  }
}