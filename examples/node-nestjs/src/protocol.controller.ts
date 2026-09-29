import {
	Body,
	Controller,
	Get,
	Headers,
	Post,
	Query,
	Req,
	Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { config } from "./config.js";
import { ProtocolService } from "./protocol.service.js";
import { requireSiteUser } from "./site-adapter.js";

@Controller()
export class ProtocolController {
	constructor(private readonly protocol: ProtocolService) {}

	@Get("healthz")
	health() {
		return { ok: true };
	}

	@Get(".well-known/wikicard-issuer.json")
	issuer(@Res({ passthrough: true }) response: Response) {
		response.setHeader("Cache-Control", "public, max-age=300");
		response.setHeader("Access-Control-Allow-Origin", "*");
		return this.protocol.authorizationServer.issuerDocument();
	}

	@Get("collection/export")
	async export(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
		const user = requireSiteUser(request);
		response.setHeader("Cache-Control", "no-store");
		response.setHeader("Content-Disposition", `attachment; filename="portable-collection-${user.id}.json"`);
		return this.protocol.exportFor(user.id);
	}

	@Post("collection-transfer/authorize/preview")
	preview(@Req() request: Request, @Body() body: unknown, @Res({ passthrough: true }) response: Response) {
		response.setHeader("Cache-Control", "no-store");
		const user = requireSiteUser(request);
		return this.protocol.authorizationServer.inspect(user.id, body);
	}

	@Post("collection-transfer/authorize")
	async authorize(@Req() request: Request, @Body() body: unknown, @Res({ passthrough: true }) response: Response) {
		response.setHeader("Cache-Control", "no-store");
		const user = requireSiteUser(request);
		return this.protocol.authorizationServer.authorize(user.id, body);
	}

	@Post("collection-transfer/token")
	async token(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
		response.setHeader("Cache-Control", "no-store");
		response.setHeader("Pragma", "no-cache");
		return this.protocol.authorizationServer.exchangeCode(body);
	}

	@Get("collection-transfer/current")
	async current(@Headers("authorization") authorization: string | undefined, @Res({ passthrough: true }) response: Response) {
		response.setHeader("Cache-Control", "no-store");
		if (!authorization?.startsWith("Bearer ")) throw Object.assign(new Error("Bearer token required"), { statusCode: 401 });
		return this.protocol.authorizationServer.consumeLiveCollection(authorization.slice(7));
	}

	@Post("collection/import/start")
	async startImport(@Req() request: Request, @Body() body: unknown) {
		const user = requireSiteUser(request);
		return this.protocol.importer.start(user.id, `${config.issuer}:user:${user.id}`, body);
	}

	@Get("collection-transfer/callback")
	async callback(@Query() query: unknown, @Res() response: Response) {
		const { code, state } = z.object({ code: z.string().min(32), state: z.string().min(32) }).parse(query);
		const verified = await this.protocol.importer.complete(code, state);
		this.protocol.linked.set(verified.destinationAccount, verified);
		return response.redirect("/integration-complete");
	}

	@Get("linked-collection")
	linked(@Req() request: Request) {
		const user = requireSiteUser(request);
		return this.protocol.linked.get(`${config.issuer}:user:${user.id}`) ?? null;
	}
}
