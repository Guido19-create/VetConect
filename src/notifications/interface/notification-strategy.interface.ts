export interface NotificationStrategy {
  send(options: any): Promise<any>;
}