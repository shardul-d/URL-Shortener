import 'dotenv/config';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';

const pool: Pool = new Pool({
  connectionString: process.env['CONNECTIONSTRING']!,
});

async function verifyConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database');
    client.release(); // Release the client back to the pool
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
}

verifyConnection();

pool.on('error', (err: Error, client: PoolClient) => {
  console.error('Error on idle client', err);
  console.error('Error occurred on idle client:', client);
});

export default pool;
