import { PocketIcServer } from '@hadronous/pic';

module.exports = async function (): Promise<void> {
  const pic = await PocketIcServer.start();
  const url = pic.getUrl();

  console.log(`PIC server started at ${url}`);

  process.env.PIC_URL = url;
  global.__PIC__ = pic;
};