import * as React from "react";
import "./TrimObjectSearchList.css";
import { inject } from "mobx-react";
import { ITrimObjectSearchListProps } from "./TrimObjectSearchList.types";
import { List, IListProps } from "office-ui-fabric-react/lib/List";
import {
	ITrimMainObject,
	ISearchResults,
	IClassification,
} from "../../trim-coms/trim-connector";
import BaseObjectTypes from "../../trim-coms/trim-baseobjecttypes";
import { TooltipHost } from "office-ui-fabric-react/lib/Tooltip";
import { Icon } from "office-ui-fabric-react/lib/Icon";
import { Text } from "office-ui-fabric-react/lib/Text";
import {
	Breadcrumb,
	IBreadcrumbItem,
} from "office-ui-fabric-react/lib/Breadcrumb";

import { Spinner, SpinnerSize } from "office-ui-fabric-react/lib/Spinner";

export interface ITrimObjectSearchListState {
	q?: string;
	items: ITrimMainObject[];
	ancestors: ITrimMainObject[];
	lastScrollPos: number;
	scrollDirection: string;
	searchShortCuts: any;
	selectedUri: number;
	isRunning: boolean;
}

export class TrimObjectSearchList extends React.Component<
	ITrimObjectSearchListProps,
	ITrimObjectSearchListState
> {
	constructor(props: ITrimObjectSearchListProps) {
		super(props);

		this._onTrimObjectSelected = this._onTrimObjectSelected.bind(this);

		this.state = this._getDefaultState();
	}

	componentDidUpdate(prevProps: ITrimObjectSearchListProps) {
		if (
			prevProps.q !== this.props.q ||
			prevProps.advancedSearch !== this.props.advancedSearch
		) {
			this.doSearch(1, ``, true);
		}

		if (prevProps.advancedSearch !== this.props.advancedSearch) {
			this.setState({ ancestors: [] });
		}
	}

	componentDidMount() {
		const { trimConnector, trimType } = this.props;
		if (trimConnector) {
			trimConnector!.getSearchClauseDefinitions(trimType!).then((data) => {
				const sc = { ...this.state.searchShortCuts };

				data.forEach((clauseDef) => {
					if (sc[trimType!][clauseDef.Id]) {
						sc[trimType!][clauseDef.Id].ToolTip = clauseDef.ToolTip;
						sc[trimType!][clauseDef.Id].Caption = clauseDef.Caption;
					}
				});

				this.setState({ searchShortCuts: sc });
			});

			if (trimType === BaseObjectTypes.Location) {
				trimConnector!.getMessages().then((messages) => {
					const sc = { ...this.state.searchShortCuts };
					sc[trimType!]["Me"].Caption = messages.bob_sbMe;
				});
			}
		}

		this.doSearch();
	}

	private _newQuery = "";
	//private _searchRunning = false;
	private _hasMore = true;
	private doSearch(
		start: number = 1,
		sortBy: string = "",
		userSearch = false
	): void {
		if (start < 2) {
			this._hasMore = true;
			this.setState((prevState) => ({
				isRunning: true,
			}));
		}

		if (/*this._searchRunning === true || */ this._hasMore === false) {
			return;
		}

		const {
			trimConnector,
			trimType,
			q,
			purpose,
			purposeExtra,
			filter,
			filterSearch,
		} = this.props;

		let query = this._newQuery;
		if (q && !query && userSearch && !this.props.advancedSearch) {
			query = trimConnector!.makeFriendlySearchQuery(trimType!, q!);
		} else if (!this._newQuery) {
			query = q!;
		}

		if (filterSearch) {
			query = query + ` AND (${filterSearch})`;
		}

		this._newQuery = ``;

		if (query && trimConnector && trimType) {
			trimConnector.cancel();

			trimConnector!
				.search<ISearchResults<ITrimMainObject>>({
					trimType: trimType,
					q: query,
					filter: filter,
					purpose: purpose || 0,
					purposeExtra: purposeExtra || 0,
					start,
					sortBy,
				})
				.then((response: ISearchResults<ITrimMainObject>) => {
					this._hasMore = response.hasMoreItems;
					if (start > 1) {
						this.setState((prevState) => ({
							items: [...prevState.items, ...response.results],
							isRunning: false,
						}));
					} else {
						this.setState({ items: response.results, isRunning: false });
					}
					//	this._searchRunning = false;
				})
				.catch(() => {
					this.setState({ isRunning: false });
				});
		} else {
			this.setState({ isRunning: false });
		}
	}

	private _onTrimObjectSelected(uri: number): void {
		const { onTrimObjectSelected } = this.props;
		if (onTrimObjectSelected && uri > 0) {
			const trimObject = this.state.items.find((i) => {
				return i.Uri == uri;
			});
			onTrimObjectSelected(trimObject);
		}
	}

	private _onTrimObjectContainerSearch(uri: number): void {
		const { includeAlternateWhenShowingFolderContents, trimType } = this.props;

		let clause = includeAlternateWhenShowingFolderContents
			? "recContainerEx"
			: "recContainer";

		if (trimType === BaseObjectTypes.Classification) {
			clause = "plnParent";
		}

		if (trimType === BaseObjectTypes.Location) {
			clause = "locMembers";
		}

		if (trimType === BaseObjectTypes.LookupItem) {
			clause = "lkiParent";
		}

		const ancestors = this.state.ancestors.slice(0);
		const currentAncestor = ancestors.find((a) => {
			return a.Uri === uri;
		});

		if (currentAncestor) {
			while (ancestors[ancestors.length - 1].Uri !== uri) {
				ancestors.pop();
			}
		} else {
			this.state.items.forEach((item) => {
				if (item.Uri === uri) {
					ancestors.push(item);
				}
			});
		}
		this.setState({ ancestors: ancestors });

		this._onShortcutClick(`${clause}:${uri}`, true);
	}

	private _onShortcutClick = (query: string, containerSearch = false) => {
		if (!containerSearch) {
			this.setState({ ancestors: [] });
		}
		this._newQuery = query;

		if (
			containerSearch &&
			this.props.contentsInReverseDateOrder &&
			this.props.trimType == BaseObjectTypes.Record
		) {
			this.doSearch(1, "recRegisteredOn-");
		} else {
			this.doSearch();
		}
	};

	private _onBreadcrumbItemClicked = (
		ev: React.MouseEvent<HTMLElement>,
		item: IBreadcrumbItem
	): void => {
		ev.preventDefault();
		this._onTrimObjectContainerSearch(Number(item.key));
	};

	public render(): JSX.Element {
		const { trimType, dialogDisplay } = this.props;
		const { searchShortCuts, items, ancestors, isRunning } = this.state;

		return (
			<div className="trim-search-list">
				<div className="trim-search-list-outer">
					<div
						className={`trim-search-shortcuts shortcut-${
							dialogDisplay ? "dialog" : "combo"
						}`}
					>
						<ul>
							{Object.keys(searchShortCuts[trimType!]).map(
								(key: any, index: number) => {
									const sc = searchShortCuts[trimType!][key];
									return (
										<TooltipHost
											key={key}
											tooltipProps={{
												onRenderContent: () => {
													return (
														<div>
															<div className="ms-fontWeight-semibold">
																{sc.Caption}
															</div>
															<div>{sc.ToolTip}</div>
														</div>
													);
												},
											}}
											id="myID"
											calloutProps={{ gapSpace: 0 }}
										>
											<li
												key={key}
												onClick={() => {
													this._onShortcutClick(sc.q);
												}}
											>
												<img
													src={`${process.env.PUBLIC_URL}/assets/${sc.src}_x32.png`}
												/>
												{dialogDisplay === true && (
													<Text variant={"smallPlus"} block={true}>
														{sc.Caption}
													</Text>
												)}
											</li>
										</TooltipHost>
									);
								}
							)}
						</ul>
					</div>
					<div
						className={`trim-list-container is-scrollable ${
							dialogDisplay ? "dialog-sizing" : "slim-sizing"
						}`}
						data-is-scrollable="true"
						onScroll={this._onScroll}
					>
						{ancestors.length > 0 && (
							<Breadcrumb
								items={ancestors.map((a) => {
									return {
										text:
											trimType === BaseObjectTypes.Classification
												? (a as IClassification).Name.Value
												: a.NameString!,
										key: String(a.Uri),
										onClick: this._onBreadcrumbItemClicked,
									};
								})}
							/>
						)}
						{isRunning === true ? (
							<Spinner size={SpinnerSize.large} />
						) : (
							<List
								items={items}
								onRenderCell={this._onRenderCell}
								onShouldVirtualize={this._onVirtualize}
								onClick={this._onListClick}
							/>
						)}
					</div>
				</div>
			</div>
		);
	}

	private findAncestor(el: HTMLElement): HTMLElement | null {
		let elReturn: HTMLElement | null = el;
		while (
			(elReturn = elReturn.parentElement) &&
			!elReturn.getAttribute("data-trim-uri")
		);
		return elReturn;
	}

	private _previousSelected: HTMLElement;

	private _onListClick = (event: React.MouseEvent<HTMLDivElement>): void => {
		event.preventDefault();

		const target = event.nativeEvent.target as HTMLElement;
		const el = this.findAncestor(target!);
		if (el) {
			if (this._previousSelected) {
				this._previousSelected.classList.remove("trim-is-selected");
			}
			this._previousSelected = el;
			el.classList.toggle("trim-is-selected");
			const uri = Number(el.getAttribute("data-trim-uri"));
			//	const { items } = this.state;

			//	for (let counter = 0; counter < items.length; counter++) {
			//		items[counter].Selected = items[counter].Uri === uri;
			//	}
			//	this.setState({ items: [...items] });

			//console.log("bb: " + uri);

			if (target.classList && target.classList.contains("trim-find-children")) {
				this._onTrimObjectContainerSearch(uri);
			} else {
				this.forceUpdate();
				this._onTrimObjectSelected(uri);
			}
		}
	};

	private _onScroll = (event: React.UIEvent<HTMLDivElement>): void => {
		if (this.state.lastScrollPos > event.currentTarget.scrollTop) {
			this.setState({
				scrollDirection: "up",
				lastScrollPos: event.currentTarget.scrollTop,
			});
		} else if (this.state.lastScrollPos < event.currentTarget.scrollTop) {
			this.setState({
				scrollDirection: "down",
				lastScrollPos: event.currentTarget.scrollTop,
			});
		}
	};

	private _onVirtualize = (props: IListProps): boolean => {
		return true;
	};

	private _onRenderCell = (
		item: ITrimMainObject,
		index: number | undefined,
		isScrolling: boolean
	): JSX.Element => {
		if (
			this.state.scrollDirection === "down" &&
			index! + 1 === this.state.items.length
		) {
			this.doSearch(this.state.items.length + 1);
		}

		let icon = "unknownExt";
		if (item.Icon) {
			if (item.Icon.Id && item.Icon.Id !== "Unknown") {
				icon = item.Icon.Id;
			} else if (item.Icon.FileType) {
				icon = item.Icon.FileType;
			}
		}

		return (
			<div
				data-is-focusable={true}
				className={`trim-list-row${
					item.Selected === true ? " trim-is-selected" : ""
				}`}
				data-trim-uri={item.Uri}
			>
				<div className="trim-list-row-label">
					<div>
						<img
							src={`${process.env.PUBLIC_URL}/assets/webIcons/${icon}_x16.png`}
						/>
					</div>
					<div className="row-text">
						{item.ToolTip
							? `${item.ToolTip} (${item.NameString})`
							: item.NameString}
					</div>
				</div>
				{item.PossiblyHasSubordinates && (
					<Icon iconName="NavigateForward" className="trim-find-children" />
				)}
			</div>
		);
	};

	private _getDefaultState(
		props: ITrimObjectSearchListProps = this.props
	): ITrimObjectSearchListState {
		return {
			q: "",
			items: [],
			ancestors: [],
			lastScrollPos: 0,
			scrollDirection: "",
			selectedUri: 0,
			isRunning: false,
			searchShortCuts: {
				[BaseObjectTypes.Record]: {
					RecordMyContainers: {
						src: "recmycontainerstray",

						q: "recMyContainers",
					},
					RecordMyDocuments: {
						src: "recrecentdocstray",

						q: "recMyDocuments",
					},
					Favorite: { src: "recfavoritestray", q: "unkFavorite" },
					RecordWorkTray: { src: "recworktray", q: "recWorkTray" },
					RecordInTray: { src: "recintray", q: "recInTray" },
					RecordDueOrInTray: { src: "recinduetray", q: "recDueOrInTray" },
					RecordCheckedOutBy: {
						src: "rec_docstray",
						q: "recCheckedOutBy:me",
					},
				},
				[BaseObjectTypes.Location]: {
					Favorite: { src: "locfavorites", q: "unkFavorite" },
					Me: { src: "User", q: "me" },
					All: { src: "loc_list", q: "unkAll" },
				},
				[BaseObjectTypes.Classification]: {
					Favorite: { src: "fpfavorites", q: "unkFavorite" },
					Top: { src: "navContents", q: "unkTop" },
					All: { src: "fpplans", q: "unkAll" },
					Owner: { src: "fpplans", q: "plnOwner:me" },
				},
				[BaseObjectTypes.LookupItem]: {
					Top: { src: "navContents", q: "unkTop" },
				},
			},
		};
	}
}

export default inject("trimConnector")(TrimObjectSearchList);
