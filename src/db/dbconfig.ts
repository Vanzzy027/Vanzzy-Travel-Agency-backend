import sql from 'mssql';
import dotenv from 'dotenv';
import assert from 'assert';

dotenv.config();

const { 
    SQL_USER, 
    SQL_PASSWORD, 
    SQL_SERVER, 
    SQL_PORT, 
    SQL_DATABASE,
    SQL_ENCRYPT,
    SQL_TRUST_SERVER_CERTIFICATE 
} = process.env;

// Ensure that the environment variables are defined
assert(SQL_USER, 'SQL_USER is not defined in environment variables');
assert(SQL_PASSWORD, 'SQL_PASSWORD is not defined in environment variables');
assert(SQL_SERVER, 'SQL_SERVER is not defined in environment variables');
assert(SQL_DATABASE, 'SQL_DATABASE is not defined in environment variables');

// Determine if we're connecting to Azure
const isAzureServer = SQL_SERVER.includes('.database.windows.net');
const shouldEncrypt = SQL_ENCRYPT === 'true' || isAzureServer;
const shouldTrustCertificate = SQL_TRUST_SERVER_CERTIFICATE === 'true' && !isAzureServer;

console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 Connecting to: ${isAzureServer ? 'Azure' : 'Local'} SQL Server`);
console.log(`📡 Server: ${SQL_SERVER}`);

// Single configuration object
const sqlConfig = {
    user: SQL_USER,
    password: SQL_PASSWORD,
    server: SQL_SERVER,
    database: SQL_DATABASE,
    port: parseInt(SQL_PORT || '1433', 10),
    connectionTimeout: isAzureServer ? 30000 : 15000,
    requestTimeout: isAzureServer ? 30000 : 15000,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: shouldEncrypt,
        trustServerCertificate: shouldTrustCertificate,
        enableArithAbort: true,
        connectTimeout: isAzureServer ? 30000 : 15000
    }
};

let globalPool: sql.ConnectionPool | null = null;

const initDatabaseConnection = async () => {
    if (globalPool && globalPool.connected) {
        console.log('🔄 Using existing database connection');
        return globalPool;
    }

    try {
        console.log(`📡 Connecting to database: ${sqlConfig.database}`);
        console.log(`🔧 Using port: ${sqlConfig.port}, Encrypt: ${sqlConfig.options.encrypt}`);
        
        globalPool = await sql.connect(sqlConfig);
        console.log('✅ Successfully connected to database');
        
        return globalPool;
    } catch (error: any) {
        console.error('❌ Database Connection Failed!');
        console.error('Error:', error.message);
        
        // Helpful troubleshooting tips
        if (isAzureServer) {
            console.error('\n⚠️ For Azure SQL, check:');
            console.error('1. Server: vankske-car-rental.database.windows.net');
            console.error('2. Username: Vanzzy');
            console.error('3. Firewall: Allow your IP in Azure Portal');
        } else {
            console.error('\n⚠️ For Local SQL Server, check:');
            console.error('1. SQL Server is running on localhost:1433');
            console.error('2. SQL Server Authentication is enabled');
            console.error('3. Try: "sqllocaldb info" in terminal');
        }
        
        throw error;
    }
};

export const getDbPool = (): sql.ConnectionPool => {
    if (!globalPool || !globalPool.connected) {
        throw new Error('Database not connected. Call initDatabaseConnection() first.');
    }
    return globalPool;
};

export const getRequest = (): sql.Request => {
    if (!globalPool || !globalPool.connected) {
        throw new Error('Database not connected. Call initDatabaseConnection() first.');
    }
    return new sql.Request(globalPool);
};

export default initDatabaseConnection;







