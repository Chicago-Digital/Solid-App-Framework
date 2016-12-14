$(document).ready(function(){
	//global vars
	var appSettings = {};
	var _appKey = $("body").attr('data-appKey');
	var _mainAppFolderLoc = '/_System/apps/'+_appKey+'/';
	var _mainAppFolder = new BCAPI.Models.FileSystem.Folder(_mainAppFolderLoc);
	var _authorization = {"Authorization": $.cookie('access_token')};
	var _$deleteButtonSelector = '.delete-app';
	$.getJSON(_mainAppFolderLoc+"_config/settings.json", function(doc) {appSettings = doc;});
	var pageOrder = "pageURL";
	var siteURL = "";
	var publicURL = "";
	var numMissingTitle = numMissingDescription = numTitleLong = numTitleShort =numDescriptionLong = numURLLong = numURLBad = numFileExt = 0;

	appTabSelector();
	deleteApp();
	appSettingsForm();
	$('.refresh-app').click(function() {
		$(".itemList").html("");
		runScan();
	});
	var request = $.ajax({
		"url": "/api/v2/admin/sites/current",
		"headers": _authorization,
		"contentType": "application/json"
	})
	request.done(function (msg) {
		for (i in msg.siteLinks)
		{
			if (msg.siteLinks[i].rel == "secureUrl") siteURL = msg.siteLinks[i].uri.substring(0, msg.siteLinks[i].uri.length - 1);
			if (msg.siteLinks[i].rel == "publicUrl") publicURL = msg.siteLinks[i].uri.substring(0, msg.siteLinks[i].uri.length - 1);
		}
		runScan();
	})

	// Standard App Functions
	var APIerrorCall = function (jqXHR,textStatus,errorThrown){
		console.log(textStatus);
		console.log("Error code: " + jqXHR.status);
		console.log("Error text: " + jqXHR.statusText);
		console.log("Response text: " + jqXHR.responseText);	
	}	
	function appTabSelector(){
		var _currentTab = window.location.pathname.split(_appKey+'/')[1];
		$('a[href^="'+_currentTab+'"]').parent().addClass('active');
	}
	function deleteApp($selector){
		var deleteButton = $selector || _$deleteButtonSelector;
		$(deleteButton).click(function() {
			console.log("click");
			var prompt = window.prompt('To confirm type DELETE');
			if (prompt === 'DELETE') {
				_mainAppFolder.destroy().done(function() {
					window.top.location.href = BCAPI.Helper.Site.getRootUrl();
				});
			} else if (prompt !== null) {
				window.alert('You must type \'DELETE\' (case sensitive) to proceed.');
			}
		 });
	}
	function appSettingsForm($formSelector,$confirmTextSelector){
		var $appSettingsForm = $formSelector || $('#appSettingsForm');
		var $appSettingsConfirm = $confirmTextSelector || $('#confirmation');
		$('input').change(function(){
			$appSettingsConfirm.text("Click to Save Changes");
		});

		$appSettingsForm.submit(function (e){
			e.preventDefault();
			$('#confirmation').text("");
			var appSettingFile = new BCAPI.Models.FileSystem.File('/_System/Apps/'+_appKey+'/_config/settings.json');
			var jsonFileData = JSON.stringify(ConvertFormToJSON($(this)));
			appSettingFile.upload(jsonFileData).done(function () {
				$appSettingsConfirm.text("Information Saved Successfully");
			}).error(function () {
				$appSettingsConfirm.text("Their was an error updating your information");
			});    
		});
	}
	function ConvertFormToJSON(form){
		var array = jQuery(form).serializeArray();
		var json = {};
		jQuery.each(array, function() {
			json[this.name] = this.value || '';
		});
		return json;
	}
	// Solid Meta Tags Functions
	function runScan(){
		clearErrors();
		if ($(".pages").length > 0){
			var pages_request = $.ajax({
				url: "/webresources/api/v3/sites/current/pages?limit=500&order=name",
				type: "GET",
				connection: "keep-alive",    
				contentType: "application/json",
				mimeType: "application/json ",
				headers: _authorization
			})
			$(".pageBody").hide();
			$(".pageBodyLoading").show();
			pages_request.done(function (msg) {

				for (var i = 0; i < msg.items.length; i++)
				{
					var page = msg.items[i];
					var pageError = false;
					var seoPageTitleLength = "", seoMetaDescriptionLength = "";
					if (!page.pageUrl.includes('_System'))
					{
						var pageDisplay = "live";
						if (!page.displayable) pageDisplay = "draft";
						else if(!page.enabled) pageDisplay = "disabled";

						if (page.title.length > 0) seoPageTitleLength = " (" + page.title.length + ")";
						if (page.seoMetadataDescription.length > 0) seoMetaDescriptionLength = " (" + page.seoMetadataDescription.length + ")";

						$tableRow = $("<tr class='rgRow' id='page-"+page.id+"'></tr>");
						$column1 = $("<td class='pageName'>"+page.name+"</td>");
						$column2 = $("<td class='pageTitle'>"+page.title+seoPageTitleLength+"</td>");
						$column3 = $("<td class='pageMetaDescription'>"+page.seoMetadataDescription+seoMetaDescriptionLength+"</td>");
						$column4 = $("<td class='pageItemUrl'>"+page.pageUrl+" ("+page.pageUrl.length+")</td>");
						$column5 = $("<td class='pageDisplay'>"+pageDisplay+"</td>");
						$column6 = $("<td class='pageExclude'>"+page.excludeFromSearch+"</td>");
						$column7 = $("<td><a target='_blank' href='"+siteURL+page.pageUrl+"?Preview=True'>Preview</a> | <a target='_blank' href='"+siteURL+"/Admin/WebPages_Detail.aspx?PageID="+page.id+"'>Edit</a></td>");

						if (pageDisplay == "live" && !page.excludeFromSearch)
						{
							var titleError = !checkTitle(page.title);
							if (titleError) $column2.addClass("error");
							var descriptionError = !checkMetaDescription(page.seoMetadataDescription);
							if (descriptionError) $column3.addClass("error");
							var URLError = !checkURL(page.pageUrl);
							if (URLError) $column4.addClass("error");
							if (titleError || descriptionError || URLError) $tableRow.addClass("rgWarning");

						}
						$tableRow.append($column1,$column2,$column3,$column4,$column5,$column6,$column7);
						$('.itemList').append($tableRow);
					}
				}
				showErrors();
				$("#myTable").tablesorter();
				$(".pageBodyLoading").hide();
				$(".pageBody").show();
			})
		} // end Pages
	}
	function checkTitle(title){
		if (!title){numMissingTitle++; return false;}
		else if (title.length == 0){numMissingTitle++; return false;}
		else if (title.length < 8){numTitleShort++; return false;}
		else if (title.length > appSettings.pageTitleLength){numTitleLong++; return false;}
		else return true;
	}
	function checkMetaDescription(description){
		if (!description){numMissingDescription++; return false;}
		else if (description.length == 0){numMissingDescription++; return false;}
		else if (description.length > appSettings.metaDescriptionLength){numDescriptionLong++}
		else return true;
	}
	function checkURL(link){
		if (!link || link.includes("/?/")){numURLBad++;return false;}
		else if (link.length > appSettings.urlLength){numURLLong++; return false;}
		if (link.includes(".") && !link.includes("index")){numFileExt++; return false;}
		else return true;
	}
	function clearErrors(){
		numMissingTitle = numMissingDescription = numTitleLong = numTitleShort =numDescriptionLong = numURLLong = numURLBad = numFileExt = 0;
	}
	function showErrors(){
		$('#mPageTitleCount .errorCount').html(" ("+numMissingTitle+")");
		$('#sPageTitleCount .errorCount').html(" ("+numTitleShort+")");
		$('#lPageTitleCount .errorCount').html(" ("+numTitleLong+")");
		$('#mPageDescriptionCount .errorCount').html(" ("+numMissingDescription+")");
		$('#lPageDescriptionCount .errorCount').html(" ("+numDescriptionLong+")");
		$('#bPageURLCount .errorCount').html(" ("+numURLBad+")");
		$('#lPageURLCount .errorCount').html(" ("+numURLLong+")");
		$('#ePageURLCount .errorCount').html(" ("+numFileExt+")");
		$('#totalPageIssues .errorCount').html(" ("+(numMissingTitle+numTitleShort+numTitleLong+numMissingDescription+numDescriptionLong+numURLLong+numFileExt+numURLBad)+")");
	}
	});