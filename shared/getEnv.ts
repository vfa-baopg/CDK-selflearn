import * as dotenv from 'dotenv';

dotenv.config({})

const getEnv = (key: string) => {
  return process.env[key];
}

export default getEnv;