export interface IGetRecordUriResponse {
	found: boolean;
	uri: number;
	message?: string;
}

export interface IWordUrl {
	getWebUrl(): Promise<string>;
}

export interface IWordConnector extends IWordUrl {
	getAccessToken(): Promise<string>;
	getUri(): Promise<IGetRecordUriResponse>;
	setUri(uri: number): Promise<IGetRecordUriResponse>;
	insertText(textToInsert: string): void;
	setAutoOpen(autoOpen: boolean): void;
	getAutoOpen(): boolean;
	saveDocument(): Promise<void>;
	getDocumentData(writeSlice: any): Promise<string>;
}

export class WordConnector implements IWordConnector {
	getDocumentData(writeSlice: any): Promise<string> {
		return new Promise((resolve, reject) => {
			const onData = (fileName: string) => {
				resolve(fileName);
			};

			this.getDocumentAsCompressed({ onData: onData, writeSlice });
		});
	}
	setAutoOpen(autoOpen: boolean): void {
		Office.context.document.settings.set(
			"Office.AutoShowTaskpaneWithDocument",
			autoOpen
		);
		Office.context.document.settings.saveAsync();
	}
	getAutoOpen(): boolean {
		const autoOpen = Office.context.document.settings.get(
			"Office.AutoShowTaskpaneWithDocument"
		);

		return autoOpen;
	}

	private getDocumentAsCompressed(args: any) {
		const me = this;

		Office.context.document.getFileAsync(
			Office.FileType.Compressed,
			{
				sliceSize: 65536 * 8 /*64 KB*/,
			},
			function(result: any) {
				if (result.status === "succeeded") {
					// If the getFileAsync call succeeded, then
					// result.value will return a valid File Object.
					var myFile = result.value;
					var sliceCount = myFile.sliceCount;
					var slicesReceived = 0,
						gotAllSlices = true,
						docdataSlices: [] = [];
					//showNotification("", "File size:" + myFile.size + " #Slices: " + sliceCount);

					// Get the file slices.
					me.getSliceAsync(
						myFile,
						0,
						sliceCount,
						gotAllSlices,
						docdataSlices,
						slicesReceived,
						args
					);
				} else {
					// showNotification("Error:", result.error.message);
				}
			}
		);
	}

	private getSliceAsync(
		file: any,
		nextSlice: any,
		sliceCount: number,
		gotAllSlices: any,
		docdataSlices: any,
		slicesReceived: any,
		args: any
	) {
		const me = this;
		file.getSliceAsync(nextSlice, function(sliceResult: any) {
			if (sliceResult.status == "succeeded") {
				if (!gotAllSlices) {
					// Failed to get all slices, no need to continue.
					return;
				}

				// Got one slice, store it in a temporary array.
				// (Or you can do something else, such as
				// send it to a third-party server.)
				//	docdataSlices[sliceResult.value.index] = sliceResult.value.data;

				const { writeSlice } = args;
				writeSlice(sliceResult.value.data, args.fileName).then(
					(result: any) => {
						args.fileName = result;
						if (++slicesReceived == sliceCount) {
							// All slices have been received.
							file.closeAsync();

							const { onData } = args;
							onData(args.fileName);

							//me.onGotAllSlices(docdataSlices, args);
						} else {
							me.getSliceAsync(
								file,
								++nextSlice,
								sliceCount,
								gotAllSlices,
								docdataSlices,
								slicesReceived,
								args
							);
						}
					}
				);
			} else {
				gotAllSlices = false;
				file.closeAsync();
				//   showNotification("getSliceAsync Error:", sliceResult.error.message);
			}
		});
	}

	// private onGotAllSlices(docdataSlices: [], args: any) {
	// 	var docdata: number[] = [];
	// 	for (var i = 0; i < docdataSlices.length; i++) {
	// 		docdata = docdata.concat(docdataSlices[i]);
	// 	}

	// 	const { onData } = args;
	// 	onData(docdata);

	// 	// var decoder = new TextDecoder('utf8');
	// 	// var b64encoded = btoa(decoder.decode(docdata));

	// 	//var fileContent = new String();
	// 	//for (var j = 0; j < docdata.length; j++) {
	// 	//    fileContent += String.fromCharCode(docdata[j]);
	// 	//}

	// 	// Now all the file content is stored in 'fileContent' variable,
	// 	// you can do something with it, such as print, fax...
	// }

	public getWebUrl(): Promise<string> {
		return new Promise((resolve, reject) => {
			Office.context.document.getFilePropertiesAsync({}, (asyncResult) => {
				var fileUrl = asyncResult.value.url;
				if (fileUrl == "") {
					reject("The file hasn't been saved yet. Save the file and try again");
				} else {
					resolve(fileUrl);
				}
			});
		});
	}

	// public getName(): Promise<string> {
	// 	return new Promise((resolve, reject) => {
	// 		this.getWebUrl().then((webUrl) => {
	// 			const tokens = webUrl.split("/");
	// 			resolve(tokens[tokens.length - 1].split(".")[0]);
	// 		});
	// 	});
	// 	//	.split("/");
	// 	//	return tokens[tokens.length - 1].split(".")[0];
	// }

	public insertText(textToInsert: string): void {
		Office.context.document.setSelectedDataAsync(
			textToInsert,
			{},
			(asyncResult: any) => {
				if (asyncResult.status == Office.AsyncResultStatus.Failed) {
					//write(asyncResult.error.message);
				}
			}
		);
	}

	public saveDocument(): Promise<void> {
		return new Promise((resolve, reject) => {
			Word.run((context) => {
				const thisDocument = context.document;

				context.load(thisDocument, "saved");
				return context
					.sync()
					.then(() => {
						if (thisDocument.saved === false) {
							// Queue a command to save this document.
							thisDocument.save();

							// Synchronize the document state by executing the queued commands,
							// and return a promise to indicate task completion.
							context
								.sync()
								.then(function() {
									//console.log('Saved the document');
									resolve();
								})
								.catch((reason) => reject(reason));
						} else {
							//console.log('The document has not changed since the last save.');
							resolve();
						}

						//	resolve();
					})
					.catch((error) => {
						reject(error);
					});
			}).catch((error) => {
				reject(error);
			});
		});
	}

	public setUri(uri: number): Promise<IGetRecordUriResponse> {
		return new Promise((resolve, reject) => {
			const response = { found: false, uri: 0, message: "" };

			Word.run((context) => {
				const customProp = context.document.properties.customProperties.add(
					"CM_Record_Uri",
					String(uri)
				);
				return context
					.sync()
					.then(() => {
						const v = customProp.value;
						if (v) {
							response.uri = Number(v);
						}
						response.found = true;
						resolve(response);
					})
					.catch((error) => {
						resolve(response);
					});
			});
		});
	}

	public getUri(): Promise<IGetRecordUriResponse> {
		return new Promise((resolve, reject) => {
			const response = { found: false, uri: 0, message: "" };

			Word.run((context) => {
				const customProps = context.document.properties.customProperties;
				context.load(customProps);

				const customProp = customProps.getItem("CM_Record_Uri");
				context.load(customProp);

				return context
					.sync()
					.then(() => {
						const v = customProp.value;

						if (v) {
							response.uri = Number(v);
							if (response.uri > 0) {
								response.found = true;
							}
						}
						resolve(response);
					})
					.catch((myError) => {
						//  response.message = myError.message || myError;
						resolve(response);
					});
			});
		});
	}

	public getAccessToken(): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			// if (Office.context.requirements.isSetSupported("IdentityAPI", 1.1)) {
			// 	reject({ message: "Identity not supported." });
			// } else {

			if (!Office.context || !Office.context["auth"]) {
				resolve("me");
			}

			(Office.context["auth"] as any).getAccessTokenAsync(
				{ forceConsent: false },
				(result: any) => {
					if (result.status === "succeeded") {

						resolve(result.value);
					} else {
						reject({ message: result.error.message });
					}
				}
			);
		});
	}
}
export default WordConnector;
