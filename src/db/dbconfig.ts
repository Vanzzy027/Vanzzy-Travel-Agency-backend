import dotenv from 'dotenv';
import assert from 'assert';
import sql, { ConnectionPool } from 'mssql'; 

// Load environment variables from our .env
dotenv.config(); 

const { SQL_USER, SQL_PASSWORD, SQL_SERVER, SQL_PORT, SQL_DATABASE } = process.env; // Destructure environment variables

// environment variables def
assert(SQL_USER, 'SQL_USER is not defined in environment variables');
assert(SQL_PASSWORD, 'SQL_PASSWORD is not defined in environment variables');
assert(SQL_SERVER, 'SQL_SERVER is not defined in environment variables');
assert(SQL_PORT, 'SQL_PORT is not defined in environment variables');
assert(SQL_DATABASE, 'SQL_DATABASE is not defined in environment variables');


// Configuration  for the db connection
const sqlConfig: sql.config = {
    user: SQL_USER,
    password: SQL_PASSWORD,
    server: SQL_SERVER as string,
    database: SQL_DATABASE as string,
    port: parseInt(SQL_PORT as string, 10), 
    connectionTimeout: 15000,
    requestTimeout: 15000,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};


// Creating a connection pool 

let globalPool: ConnectionPool | null = null;

const initDatabaseConnection = async () => {
    //  existing connection 
    if (globalPool && globalPool.connected) {
        console.log('Using existing database connection');
        return globalPool;
    }

    try {
        console.log('Attempting to create connection pool with config:', {
            // server: sqlConfig.server,
            // database: sqlConfig.database,
            // port: sqlConfig.port,
            // user: sqlConfig.user,
        });
        
        globalPool = new sql.ConnectionPool(sqlConfig); 
        console.log('Connection pool created🚀, attempting to connect...');
        await globalPool.connect();
        console.log('✅ Connected to MSSQL Database');
        return globalPool;
    } catch (error: any) {
        console.error('❌ Database Connection Failed!');
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            number: error.number,
            state: error.state
        });
        throw error;
    }
};

// Get database pool
export const getDbPool = (): ConnectionPool => {
    if (!globalPool || !globalPool.connected) {
        throw new Error('Database not connected. Call initDatabaseConnection() first.');
    }
    return globalPool;
};

// Get a new request instance
export const getRequest = (): sql.Request => {

    if (!globalPool || !globalPool.connected) {
        throw new Error('Database not connected. Call initDatabaseConnection() first.');
    }
    return new sql.Request(globalPool);
};



export default initDatabaseConnection; 


