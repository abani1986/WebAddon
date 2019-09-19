import * as React from "react";
import { shallow } from "enzyme";
import { TextField } from "office-ui-fabric-react/lib/TextField";
import { DatePicker } from "office-ui-fabric-react/lib/DatePicker";
import TrimObjectPicker from "./TrimObjectPicker/TrimObjectPicker";
import { PropertySheet } from "./PropertySheet";
import BaseObjectTypes from "../trim-coms/trim-baseobjecttypes";
import { Provider } from "mobx-react";
import { PivotItem } from "office-ui-fabric-react/lib/Pivot";

describe("Property Sheet", function() {
	it("displays nothing when form definition is null", () => {
		const wrapper = shallow<PropertySheet>(
			<PropertySheet formDefinition={null} />
		);

		expect(wrapper.children()).toHaveLength(0);
	});

	it("displays nothing when form definition is empty", () => {
		const wrapper = shallow<PropertySheet>(
			<PropertySheet formDefinition={{}} />
		);

		expect(wrapper.children()).toHaveLength(0);
	});

	it("displays nothing when form definition has no pages", () => {
		const wrapper = shallow<PropertySheet>(
			<PropertySheet formDefinition={{ Pages: [] }} />
		);

		expect(wrapper.children()).toHaveLength(0);
	});

	it("creates pages", () => {
		const wrapperWithForm = shallow<PropertySheet>(
			<PropertySheet
				defaultRecordTitle="test title"
				formDefinition={{
					Pages: [
						{
							Caption: "General",
							Type: "Normal",
							PageItems: [
								{
									Format: "String",
									Name: "RecordTypedTitle",
									Caption: "Title (Free Text Part)",
								},
							],
						},
						{
							Type: "Normal",
							Caption: "Extra",

							PageItems: [{}],
						},
					],
				}}
			/>
		);

		expect(wrapperWithForm.find(PivotItem).length).toEqual(2);
	});

	it("does not create special pages", () => {
		const wrapperWithForm = shallow<PropertySheet>(
			<PropertySheet
				defaultRecordTitle="test title"
				formDefinition={{
					Pages: [
						{
							Caption: "General",
							Type: "Normal",
							PageItems: [
								{
									Format: "String",
									Name: "RecordTypedTitle",
									Caption: "Title (Free Text Part)",
								},
							],
						},
						{
							Type: "Notes",
							Caption: "Notes",
							CaptionsAbove: false,
							HighlightMandatory: false,
							Mandatory: false,
							NotesStyle: 2,
							PageItems: [],
							ChildType: "Unknown",
						},
					],
				}}
			/>
		);

		expect(wrapperWithForm.find(PivotItem).length).toEqual(1);
	});

	it("displays a text field with label", () => {
		const wrapperWithForm = shallow<PropertySheet>(
			<PropertySheet
				defaultRecordTitle="test title"
				formDefinition={{
					Pages: [
						{
							Caption: "General",
							Type: "Normal",
							PageItems: [
								{
									Format: "String",
									Name: "RecordTypedTitle",
									Caption: "Title (Free Text Part)",
								},
							],
						},
					],
				}}
			/>
		);

		expect(wrapperWithForm.find(TextField).exists()).toBeTruthy();
		expect(wrapperWithForm.find(TextField).props().label).toEqual(
			"Title (Free Text Part)"
		);
		expect(wrapperWithForm.find(TextField).props().defaultValue).toEqual(
			"test title"
		);
		expect(wrapperWithForm.find(TextField).props().multiline).toBeFalsy();

		// when > 40 characters entered switch to multi-line
		wrapperWithForm
			.find(TextField)
			.props()
			.onChange(null, "01234567890123456789012345678901234567890");
		expect(wrapperWithForm.find(TextField).props().multiline).toBeTruthy();

		wrapperWithForm
			.find(TextField)
			.props()
			.onChange(null, "012345678");
		expect(wrapperWithForm.find(TextField).props().multiline).toBeFalsy();
	});

	it("fires the onChange event when a text field loads with a value", () => {
		let onChangeForm;
		const wrapperWithForm = shallow<PropertySheet>(
			<PropertySheet
				onChange={function(newForm) {
					onChangeForm = newForm;
				}}
				formDefinition={{
					Pages: [
						{
							Caption: "General",
							Type: "Normal",
							PageItems: [
								{
									Format: "String",
									Name: "RecordTypedTitle",
									Caption: "Title (Free Text Part)",
									Value: "abc",
								},
							],
						},
					],
				}}
			/>
		);

		expect(onChangeForm).toEqual({ RecordTypedTitle: "abc" });
	});

	it("fires the onChange event when a text field changes", () => {
		let onChangeForm;
		const wrapperWithForm = shallow<PropertySheet>(
			<PropertySheet
				onChange={function(newForm) {
					onChangeForm = newForm;
				}}
				formDefinition={{
					Pages: [
						{
							Caption: "General",
							Type: "Normal",
							PageItems: [
								{
									Format: "String",
									Name: "RecordTypedTitle",
									Caption: "Title (Free Text Part)",
								},
							],
						},
					],
				}}
			/>
		);

		wrapperWithForm
			.find(TextField)
			.props()
			.onChange(null, "abc");

		expect(onChangeForm).toEqual({ RecordTypedTitle: "abc" });
	});

	it("fires the onChange event when a date picker changes", () => {
		let onChangeForm;
		const wrapperWithForm = shallow<PropertySheet>(
			<PropertySheet
				onChange={function(newForm) {
					onChangeForm = newForm;
				}}
				formDefinition={{
					Pages: [
						{
							Caption: "General",
							Type: "Normal",
							PageItems: [
								{
									Format: "Datetime",
									Name: "RecordDateCreated",
									Caption: "a date",
									Value: {
										DateTime: "2018-12-14T15:37:06.0000000+11:00",
									},
								},
							],
						},
					],
				}}
			/>
		);

		expect(onChangeForm).toEqual({
			RecordDateCreated: new Date(
				"2018-12-14T15:37:06.0000000+11:00"
			).toISOString(),
		});

		const testDate = new Date();
		wrapperWithForm
			.find(DatePicker)
			.props()
			.onSelectDate(testDate);

		expect(onChangeForm).toEqual({ RecordDateCreated: testDate.toISOString() });
	});

	describe("Date properties", () => {
		const wrapper = shallow<PropertySheet>(
			<PropertySheet
				formDefinition={{
					Pages: [
						{
							Caption: "General",
							Type: "Normal",
							PageItems: [
								{
									Format: "Datetime",
									Name: "RecordDateCreated",
									Caption: "Date created",
									Value: {
										DateTime: "2018-12-14T15:37:06.0000000+11:00",
									},
								},
								{
									Format: "Datetime",
									Name: "RecordDateDue",
									Caption: "Date due",
									Value: {
										DateTime: "0001-01-01T00:00:00.0000000+11:00",
										IsClear: true,
									},
								},
							],
						},
					],
				}}
			/>
		);

		it("adds a date field to the property sheet", () => {
			expect.assertions(3);
			expect(
				wrapper
					.find(DatePicker)
					.at(0)
					.exists()
			).toBeTruthy();
			expect(
				wrapper
					.find(DatePicker)
					.at(0)
					.props().label
			).toEqual("Date created");

			expect(
				wrapper
					.find(DatePicker)
					.at(0)
					.props().value
			).toBeInstanceOf(Date);
		});

		it("does not set a value when IsClear == true", () => {
			expect.assertions(1);

			expect(
				wrapper
					.find(DatePicker)
					.at(1)
					.props().value
			).toBeFalsy();
		});
	});

	describe("Trim Object Properties", () => {
		let onChangeForm;
		const wrapper = shallow<PropertySheet>(
			<PropertySheet
				onChange={function(newForm) {
					onChangeForm = newForm;
				}}
				formDefinition={{
					Pages: [
						{
							Caption: "General",
							Type: "Normal",
							PageItems: [
								{
									Format: "Object",
									Name: "RecordContainer",
									Caption: "Container",
									ObjectType: "Record",
									EditPurpose: 1,
									EditPurposeExtra: 9000000500,
									Value: {
										TrimType: "LookupItem",
										NameString: "High",

										Uri: 1,
									},
								},
							],
						},
					],
				}}
			/>
		);

		it("adds a TrimObjectPicker to the property sheet", () => {
			const objectPicker = wrapper.find(TrimObjectPicker).at(0);
			expect.assertions(6);
			expect(objectPicker.exists()).toBeTruthy();

			expect(objectPicker.props().label).toEqual("Container");
			expect(objectPicker.props().trimType).toEqual(BaseObjectTypes.Record);
			expect(objectPicker.props().propertyName).toEqual("RecordContainer");
			expect(objectPicker.props().purpose).toEqual(1);
			expect(objectPicker.props().purposeExtra).toEqual(9000000500);
		});

		it("fires the onChange event when an object picker loads", () => {
			expect(onChangeForm).toEqual({ RecordContainer: 1 });
		});

		it("fires the onChange event when an object picker changes", () => {
			const testObject = { Uri: 2, NameString: "test" };

			wrapper
				.find(TrimObjectPicker)
				.props()
				.onTrimObjectSelected(testObject);

			expect(onChangeForm).toEqual({ RecordContainer: testObject.Uri });
		});
	});

	describe("LookupSet", () => {
		let onChangeForm;
		const wrapper = shallow<PropertySheet>(
			<PropertySheet
				onChange={function(newForm) {
					onChangeForm = newForm;
				}}
				formDefinition={{
					Pages: [
						{
							Caption: "General",
							Type: "Normal",
							PageItems: [
								{
									Format: "String",
									Name: "Something_Field",
									Caption: "Something",
									LookupSetUri: 9000000004,
									ObjectType: "Unknpown",
								},
							],
						},
					],
				}}
			/>
		);

		it("adds a TrimObjectPicker to the property sheet", () => {
			const objectPicker = wrapper.find(TrimObjectPicker).at(0);
			expect.assertions(4);
			expect(objectPicker.exists()).toBeTruthy();

			expect(objectPicker.props().label).toEqual("Something");
			expect(objectPicker.props().trimType).toEqual(BaseObjectTypes.LookupItem);
			expect(objectPicker.props().filter).toEqual("lkiSet:9000000004");
		});

		it("fires the onChange event when an object picker changes", () => {
			const testObject = { Uri: 2, NameString: "test" };

			wrapper
				.find(TrimObjectPicker)
				.props()
				.onTrimObjectSelected(testObject);

			expect(onChangeForm).toEqual({ Something_Field: "test" });
		});
	});

	it("fires the onChange event when a text field changes", () => {
		let onChangeForm;
		const wrapperWithForm = shallow<PropertySheet>(
			<PropertySheet
				onChange={function(newForm) {
					onChangeForm = newForm;
				}}
				formDefinition={{
					Pages: [
						{
							Caption: "General",
							Type: "Normal",
							PageItems: [
								{
									Format: "String",
									Name: "RecordTypedTitle",
									Caption: "Title (Free Text Part)",
								},
							],
						},
					],
				}}
			/>
		);

		wrapperWithForm
			.find(TextField)
			.props()
			.onChange(null, "abc");

		expect(onChangeForm).toEqual({ RecordTypedTitle: "abc" });
	});
});
