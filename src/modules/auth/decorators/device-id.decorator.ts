import { ExecutionContext, createParamDecorator } from "@nestjs/common";

export const DeviceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.deviceId;
  },
); 