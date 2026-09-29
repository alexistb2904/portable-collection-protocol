import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { config } from "./config.js";

const app = await NestFactory.create(AppModule, { bodyParser: true });
await app.listen(config.PORT, "0.0.0.0");
