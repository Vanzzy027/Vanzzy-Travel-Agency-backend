import sql from 'mssql';
import dotenv from 'dotenv';
import assert from 'assert';

dotenv.config();

const { 
    SQL_USER, 
    SQL_PASSWORD, 
    SQL_SERVER, 
    SQL_PORT, 
    SQL_DB,
    // Optional flags for Azure
    SQL_ENCRYPT,
    SQL_TRUST_SERVER_CERTIFICATE 
} = process.env;

// Ensure that the environment variables are defined
assert(SQL_USER, 'SQL_USER is not defined in environment variables');
assert(SQL_PASSWORD, 'SQL_PASSWORD is not defined in environment variables');
assert(SQL_SERVER, 'SQL_SERVER is not defined in environment variables');
assert(SQL_DB, 'SQL_DATABASE is not defined in environment variables');

// Determine if we're connecting to Azure
const isAzureServer = SQL_SERVER.includes('.database.windows.net');
const shouldEncrypt = SQL_ENCRYPT === 'true' || isAzureServer;
const shouldTrustCertificate = SQL_TRUST_SERVER_CERTIFICATE === 'true' && !isAzureServer;

console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 Server: ${SQL_SERVER}`);
console.log(`🔐 Encrypt: ${shouldEncrypt}`);
console.log(`⚡ Azure: ${isAzureServer ? 'Yes' : 'No'}`);

// Single configuration object
export const Config = {
    sqlConfig: {
        user: SQL_USER,
        password: SQL_PASSWORD,
        server: SQL_SERVER,
        database: SQL_DB,
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
    }
};

let globalPool: sql.ConnectionPool | null = null;

const initDatabaseConnection = async () => {
    if (globalPool && globalPool.connected) {
        console.log('🔄 Using existing database connection');
        return globalPool;
    }

    try {
        console.log(`📡 Connecting to: ${Config.sqlConfig.server}:${Config.sqlConfig.port}`);
        console.log(`📊 Database: ${Config.sqlConfig.database}`);
        
        globalPool = await sql.connect(Config.sqlConfig);
        console.log('✅ Connected to SQL SERVER Database');
        
        return globalPool;
    } catch (error: any) {
        console.error('❌ Database Connection Failed!');
        console.error('Error:', error.message);
        console.error('\n🔧 Connection Details:');
        console.error(`Server: ${SQL_SERVER}`);
        console.error(`Database: ${SQL_DB}`);
        console.error(`User: ${SQL_USER}`);
        console.error(`Port: ${SQL_PORT || '1433'}`);
        console.error(`Encrypt: ${shouldEncrypt}`);
        
        // Helpful troubleshooting tips
        if (isAzureServer) {
            console.error('\n⚠️ Azure SQL Troubleshooting:');
            console.error('1. Check firewall rules in Azure Portal');
            console.error('2. Verify server name ends with .database.windows.net');
            console.error('3. Ensure credentials are correct');
            console.error('4. Check if database exists');
        } else {
            console.error('\n⚠️ Local SQL Server Troubleshooting:');
            console.error('1. Ensure SQL Server is running');
            console.error('2. Enable TCP/IP in SQL Server Configuration Manager');
            console.error('3. Try connecting with SQL Server Management Studio');
            console.error('4. Check if "sa" account is enabled');
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

// Helper to get a new request
export const getRequest = (): sql.Request => {
    if (!globalPool || !globalPool.connected) {
        throw new Error('Database not connected. Call initDatabaseConnection() first.');
    }
    return new sql.Request(globalPool);
};

// Health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
    try {
        if (!globalPool || !globalPool.connected) {
            await initDatabaseConnection();
        }
        const request = getRequest();
        const result = await request.query('SELECT 1 as status');
        return result.recordset[0]?.status === 1;
    } catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
};

export default initDatabaseConnection;

// import dotenv from 'dotenv';
// import assert from 'assert';
// import sql, { ConnectionPool } from 'mssql';

// // Load environment variables
// dotenv.config();

// const {
//     SQL_USER,
//     SQL_PASSWORD,
//     SQL_SERVER,
//     SQL_PORT,
//     SQL_DATABASE,
//     // Azure-specific variables
//     SQL_AZURE,
//     AZURE_SQL_USER,
//     AZURE_SQL_PASSWORD,
//     AZURE_SQL_SERVER,
//     AZURE_SQL_DATABASE,
//     SQL_ENCRYPT,
//     SQL_TRUST_SERVER_CERTIFICATE
// } = process.env;

// // Determine which environment we're running in
// const isAzure = SQL_AZURE === 'true' || AZURE_SQL_SERVER !== undefined;
// const isLocal = !isAzure;

// console.log(`🔍 Environment: ${isAzure ? 'Azure SQL Database' : 'Local SQL Server'}`);

// // Select appropriate configuration based on environment
// let sqlConfig: sql.config;

// if (isAzure) {
//     // Azure SQL Database configuration
//     assert(AZURE_SQL_USER, 'AZURE_SQL_USER is required for Azure SQL Database');
//     assert(AZURE_SQL_PASSWORD, 'AZURE_SQL_PASSWORD is required for Azure SQL Database');
//     assert(AZURE_SQL_SERVER, 'AZURE_SQL_SERVER is required for Azure SQL Database');
//     assert(AZURE_SQL_DATABASE, 'AZURE_SQL_DATABASE is required for Azure SQL Database');

//     const serverName = AZURE_SQL_SERVER.includes('.database.windows.net') 
//         ? AZURE_SQL_SERVER 
//         : `${AZURE_SQL_SERVER}.database.windows.net`;

//     sqlConfig = {
//         user: AZURE_SQL_USER,
//         password: AZURE_SQL_PASSWORD,
//         server: serverName,
//         database: AZURE_SQL_DATABASE,
//         port: 1433, // Default Azure SQL port
//         connectionTimeout: 30000,
//         requestTimeout: 30000,
//         pool: {
//             max: 10,
//             min: 0,
//             idleTimeoutMillis: 30000
//         },
//         options: {
//             encrypt: true, // Azure requires encryption
//             trustServerCertificate: false, // Should be false for production Azure
//             enableArithAbort: true
//         }
//     };
// } else {
//     // Local SQL Server configuration (your existing config)
//     assert(SQL_USER, 'SQL_USER is required for local SQL Server');
//     assert(SQL_PASSWORD, 'SQL_PASSWORD is required for local SQL Server');
//     assert(SQL_SERVER, 'SQL_SERVER is required for local SQL Server');
//     assert(SQL_DATABASE, 'SQL_DATABASE is required for local SQL Server');

//     sqlConfig = {
//         user: SQL_USER,
//         password: SQL_PASSWORD,
//         server: SQL_SERVER,
//         database: SQL_DATABASE,
//         port: parseInt(SQL_PORT || '1433', 10),
//         connectionTimeout: 15000,
//         requestTimeout: 15000,
//         pool: {
//             max: 10,
//             min: 0,
//             idleTimeoutMillis: 30000
//         },
//         options: {
//             //encrypt: SQL_ENCRYPT === 'true', // Can be configured via env
//             //trustServerCertificate: SQL_TRUST_SERVER_CERTIFICATE === 'true', // Can be configured via env
//             enableArithAbort: true
//         }
//     };
// }

// // Connection pool instance
// let globalPool: ConnectionPool | null = null;

// // Initialize database connection
// const initDatabaseConnection = async (): Promise<ConnectionPool> => {
//     // Return existing connection if available and connected
//     if (globalPool && globalPool.connected) {
//         console.log('🔄 Using existing database connection pool');
//         return globalPool;
//     }

//     try {
//         console.log(`📡 Attempting to connect to ${isAzure ? 'Azure' : 'local'} database...`);
//         console.log('🔧 Connection details:', {
//             server: sqlConfig.server,
//             database: sqlConfig.database,
//             user: sqlConfig.user,
//             port: sqlConfig.port,
//             encrypt: sqlConfig.options?.encrypt
//         });

//         // Create new connection pool
//         globalPool = new sql.ConnectionPool(sqlConfig);
        
//         // Set up error handling for the pool
//         globalPool.on('error', (err) => {
//             console.error('❌ Database connection pool error:', err);
//             globalPool = null;
//         });

//         // Connect to database
//         await globalPool.connect();
        
//         console.log(`✅ Successfully connected to ${isAzure ? 'Azure SQL Database' : 'Local SQL Server'}`);
        
//         // Test connection with a simple query
//         const result = await globalPool.request().query('SELECT @@VERSION as version');
//         console.log('📊 Database version:', result.recordset[0]?.version?.substring(0, 50) + '...');
        
//         return globalPool;
//     } catch (error: any) {
//         console.error('❌ Database connection failed!');
//         console.error('Error details:', {
//             message: error.message,
//             code: error.code,
//             number: error.number,
//             state: error.state,
//             server: sqlConfig.server,
//             database: sqlConfig.database
//         });
        
//         // Don't throw for Azure connection issues in some cases
//         if (isAzure) {
//             console.warn('⚠️ Azure SQL connection failed. Check firewall rules and credentials.');
//         }
        
//         throw error;
//     }
// };

// // Get database pool
// export const getDbPool = (): ConnectionPool => {
//     if (!globalPool || !globalPool.connected) {
//         throw new Error(`Database not connected. Call initDatabaseConnection() first. Environment: ${isAzure ? 'Azure' : 'Local'}`);
//     }
//     return globalPool;
// };

// // Get a new request instance
// export const getRequest = (): sql.Request => {
//     if (!globalPool || !globalPool.connected) {
//         throw new Error(`Database not connected. Call initDatabaseConnection() first. Environment: ${isAzure ? 'Azure' : 'Local'}`);
//     }
//     return new sql.Request(globalPool);
// };

// // Close database connection
// export const closeDatabaseConnection = async (): Promise<void> => {
//     if (globalPool && globalPool.connected) {
//         try {
//             await globalPool.close();
//             console.log('🔌 Database connection closed');
//         } catch (error) {
//             console.error('Error closing database connection:', error);
//         } finally {
//             globalPool = null;
//         }
//     }
// };

// // Health check function
// export const checkDatabaseHealth = async (): Promise<boolean> => {
//     try {
//         if (!globalPool || !globalPool.connected) {
//             await initDatabaseConnection();
//         }
//         const request = getRequest();
//         const result = await request.query('SELECT 1 as status');
//         return result.recordset[0]?.status === 1;
//     } catch (error) {
//         console.error('Database health check failed:', error);
//         return false;
//     }
// };

// export default initDatabaseConnection;

// // import dotenv from 'dotenv';
// // import assert from 'assert';
// // import sql, { ConnectionPool } from 'mssql'; 

// // // Load environment variables from our .env
// // dotenv.config(); 

// // const { SQL_USER, SQL_PASSWORD, SQL_SERVER, SQL_PORT, SQL_DATABASE } = process.env; // Destructure environment variables

// // // environment variables def
// // assert(SQL_USER, 'SQL_USER is not defined in environment variables');
// // assert(SQL_PASSWORD, 'SQL_PASSWORD is not defined in environment variables');
// // assert(SQL_SERVER, 'SQL_SERVER is not defined in environment variables');
// // assert(SQL_PORT, 'SQL_PORT is not defined in environment variables');
// // assert(SQL_DATABASE, 'SQL_DATABASE is not defined in environment variables');


// // // Configuration  for the db connection
// // const sqlConfig: sql.config = {
// //     user: SQL_USER,
// //     password: SQL_PASSWORD,
// //     server: SQL_SERVER as string,
// //     database: SQL_DATABASE as string,
// //     port: parseInt(SQL_PORT as string, 10), 
// //     connectionTimeout: 15000,
// //     requestTimeout: 15000,
// //     pool: {
// //         max: 10,
// //         min: 0,
// //         idleTimeoutMillis: 30000
// //     },
// //     options: {
// //         encrypt: false,
// //         trustServerCertificate: true,
// //         enableArithAbort: true
// //     }
// // };


// // // Creating a connection pool 

// // let globalPool: ConnectionPool | null = null;

// // const initDatabaseConnection = async () => {
// //     //  existing connection 
// //     if (globalPool && globalPool.connected) {
// //         console.log('Using existing database connection');
// //         return globalPool;
// //     }

// //     try {
// //         console.log('Attempting to create connection pool with config:', {
// //             // server: sqlConfig.server,
// //             // database: sqlConfig.database,
// //             // port: sqlConfig.port,
// //             // user: sqlConfig.user,
// //         });
        
// //         globalPool = new sql.ConnectionPool(sqlConfig); 
// //         console.log('Connection pool created🚀, attempting to connect...');
// //         await globalPool.connect();
// //         console.log('✅ Connected to MSSQL Database');
// //         return globalPool;
// //     } catch (error: any) {
// //         console.error('❌ Database Connection Failed!');
// //         console.error('Error details:', {
// //             message: error.message,
// //             code: error.code,
// //             number: error.number,
// //             state: error.state
// //         });
// //         throw error;
// //     }
// // };

// // // Get database pool
// // export const getDbPool = (): ConnectionPool => {
// //     if (!globalPool || !globalPool.connected) {
// //         throw new Error('Database not connected. Call initDatabaseConnection() first.');
// //     }
// //     return globalPool;
// // };

// // // Get a new request instance
// // export const getRequest = (): sql.Request => {

// //     if (!globalPool || !globalPool.connected) {
// //         throw new Error('Database not connected. Call initDatabaseConnection() first.');
// //     }
// //     return new sql.Request(globalPool);
// // };



// // export default initDatabaseConnection; 


