class Contract
{
    constructor(web3Contract)
    {
        this.web3Contract = web3Contract;
    }

    //Contracts    
    async deploySmartContract(params, executor)
    {
        return await this.web3Contract.deploySmartContract(params, executor);
    }

    async callSmartContract(params, executor)
    {
        return await this.web3Contract.callSmartContract(params, executor);
    }

    async readSmartContract(params)
    {
        return await this.web3Contract.readSmartContract(params);
    }

    async getParallelBalance(params)
    {
        return await this.web3Contract.getParallelBalance(params);
    }

    async getFilteredScOutputEvents(params)
    {
        return await this.web3Contract.getFilteredScOutputEvents(params);
    }

    async getDatastoreEntry(params)
    {
        return await this.web3Contract.getDatastoreEntry(params.smartContractAddress, params.key);
    }

    async executeReadOnlySmartContract(params)
    {
        return await this.web3Contract.executeReadOnlySmartContract(params);
    }

    async getOperationStatus(params)
    {
        return await this.web3Contract.getOperationStatus(params);
    }

    async awaitRequiredOperationStatus(params)
    {
        return await this.web3Contract.awaitRequiredOperationStatus(params.opId, params.requiredStatus);
    }
}

export default Contract;