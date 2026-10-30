import { Controller, Get } from "@nestjs/common";
@Controller()
export class HealthController {
  @Get("health")
  health(){ return { ok:true, db:"supabase" }; }
  @Get()
  root(){ return { ok:true, service:"licitabot-api-nest" }; }
}
