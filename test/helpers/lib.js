function decodeLogs(logs, emitter, eventName) {
	let abi;
	let address;
	abi = emitter.interface.fragments;
	try {
		address = emitter.address;
	} catch (e) {
		address = null;
	}

	let eventABI = abi.filter((x) => x.type === "event" && x.name === eventName);
	if (eventABI.length === 0) {
		throw new Error(`No ABI entry for event '${eventName}'`);
	} else if (eventABI.length > 1) {
		throw new Error(`Multiple ABI entries for event '${eventName}', only uniquely named events are supported`);
	}

	eventABI = eventABI[0];

	// The first topic will equal the hash of the event signature
	const eventSignature = `${eventName}(${eventABI.inputs.map((input) => input.type).join(",")})`;
	const eventTopic = web3.utils.sha3(eventSignature);

	// Only decode events of type 'EventName'
	return logs
		.filter((log) => log.topics.length > 0 && log.topics[0] === eventTopic && (!address || log.address === address))
		.map((log) => web3.eth.abi.decodeLog(eventABI.inputs, log.data, log.topics.slice(1)))
		.map((decoded) => ({ event: eventName, args: decoded }));
}

function buildParams (
	tokenName,
	tokenSymbol,
	tokenURI,
	tokenAddress,
	price,
	maxNfts,
	maxTokensPerTransaction,
	saleStartTime,
	saleEndTime,
	publicSaleStartTime,
	maxSupplyPresale,
	maxMintedPresalePerAddress,
	pricePresale,
	owner
) {
	let params = {
		name: tokenName,
		symbol: tokenSymbol,
		baseURI: tokenURI,
		saleToken: tokenAddress,
		price: price,
		maxNft: maxNfts,
		maxTokensPerTransaction: maxTokensPerTransaction,
		saleStartTime: saleStartTime,
		saleEndTime: saleEndTime,
		publicSaleStartTime: publicSaleStartTime,
		maxMintedPresalePerAddress: maxMintedPresalePerAddress,
		pricePresale: pricePresale,
		owner: owner,
	};

	return params;
}

function buildParamsStandard (
	tokenName,
	tokenSymbol,
	tokenURI,
	tokenAddress,
	price,
	maxNfts,
	maxTokensPerTransaction,
	saleStartTime,
	saleEndTime,
	owner
) {
	let params = {
		name: tokenName,
		symbol: tokenSymbol,
		baseURI: tokenURI,
		saleToken: tokenAddress,
		price: price,
		maxNft: maxNfts,
		maxTokensPerTransaction: maxTokensPerTransaction,
		saleStartTime: saleStartTime,
		saleEndTime: saleEndTime,
		owner: owner,
	};

	return params;
}

function buildParamsStandard1155 (
	tokenName,
	tokenSymbol,
	tokenURI,
	owner
) {
	let params = {
		name: tokenName,
		symbol: tokenSymbol,
		baseURI: tokenURI,
		owner: owner,
	};

	return params;
}

function buildTokenSettings1155 (
	tokenID,
	maxTokensPerTransaction,
	tokenPrice,
	maxSupply,
	saleStartTime,
	saleEndTime,
	saleToken,
	active
) {
	let params = {
		tokenID,
		maxTokensPerTransaction,
		tokenPrice,
		maxSupply,
		saleStartTime,
		saleEndTime,
		saleToken,
		active
	};

	return params;
}
 
function buildPresaleSettings1155(
	publicSaleStartTime,
	maxMintedPresalePerAddress,
	tokenPricePresale,
	merkleRoot
) {
	let params = {
		publicSaleStartTime,
		maxMintedPresalePerAddress,
		tokenPricePresale,
		merkleRoot
	}

	return params;
}

module.exports = {
	decodeLogs,
	buildParams,
	buildParamsStandard,
	buildParamsStandard1155,
	buildTokenSettings1155,
	buildPresaleSettings1155
}