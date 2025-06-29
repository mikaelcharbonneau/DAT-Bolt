module.exports = async function (context, req) {
    context.log('UltraSimple function started');
    
    context.res = {
        status: 200,
        body: "Hello World from Azure Functions!"
    };
    
    context.log('UltraSimple function completed');
}; 