import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  compile(templateName: string, data: any): string {
    const templatePath = path.join(process.cwd(), 'src', 'notifications', 'templates', `${templateName}.hbs`);

    if (!fs.existsSync(templatePath)) {
      this.logger.error(`Plantilla no encontrada: ${templatePath}`);
      return data.text || '';
    }

    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);
    
    return template({
      ...data,
      appLogo: process.env.APP_LOGO_URL || 'https://tu-web.com/logo.png',
      appName: 'VetConnect'
    });
  }
}