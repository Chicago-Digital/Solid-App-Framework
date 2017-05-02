$(document).ready(function(){
	// *** global framework variables ***
	var _appSettings,_apiCalls = {};
	var _appKey = $("body").attr('data-appKey');
	var _mainAppFolderLoc = '/_System/apps/'+_appKey+'/';
	var _authorization = {"Authorization": $.cookie('access_token')};
	var _$deleteButtonSelector = '.delete-app';
	var _secureURL = "";
	var _publicURL = "";
	$.getJSON(_mainAppFolderLoc+"_config/settings.json", function(doc) {
		_appSettings = doc;
		$.getJSON(_mainAppFolderLoc+"_assets/js/apiCalls.json", function(doc) {
			_apiCalls = doc;
			var request = $.ajax({
				"url": "/api/v2/admin/sites/current",
				"headers": _authorization,
				"contentType": "application/json"
			})
			request.done(function (msg) {
				for (i in msg.siteLinks)
				{
					if (msg.siteLinks[i].rel == "secureUrl") _secureURL = msg.siteLinks[i].uri.substring(0, msg.siteLinks[i].uri.length - 1);
					if (msg.siteLinks[i].rel == "publicUrl") _publicURL = msg.siteLinks[i].uri.substring(0, msg.siteLinks[i].uri.length - 1);
				}
				appBody();
			})
		});
	});
	
	// *** global app variables ***
	var numMissingTitle = numMissingDescription = numTitleLong = numTitleShort =numDescriptionLong = numURLLong = numURLBad = numFileExt = 0;

	appTabSelector();
	
	// This executes once all the initial AJAX calls are made to make sure the variables are ready to use
	// Place your app code in this function
	function appBody(){
		if ($(".pages").length > 0){
		clearErrors();
		$(".pageBody").hide();
		$(".pageBodyLoading").show();
		getAllItems(_apiCalls.pages,displayPages);
			
		}
		$('.refresh-app').click(function() {
			$(".itemList").html("");
			appBody();
		});
		$(document).one("ajaxStop", function(){
			$("#myTable").tablesorter({
				sortList: [[3,0],[0,0]] 
			});
			$(".pageBodyLoading").hide();
			showErrors();
			$(".pageBody").show();
			$(".export").click(function(){
				$('.rgMasterTable').TableCSVExport({
				delivery: 'download',
				filename: 'site-content.csv'
				});	
			})
		});
		deleteApp();
		appSettingsForm();
	}

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
			var prompt = window.prompt('To confirm type DELETE');
			if (prompt === 'DELETE') {
				var request = $.ajax({
					url: "/api/v2/admin/sites/current/storage"+_mainAppFolderLoc,
					type: "DELETE",
					headers: _authorization
				})
				request.done(function (msg) {
					window.top.location.href = _secureURL+"/Admin/Dashboard_Business.aspx";			 
				})
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
	
	// displayPages recursive function to handle unlimited number of pages
	function getAllItems(APIurl,callback,recursiveURL){
		var apiCall_limit = 500;
		var itemsURL = recursiveURL || APIurl+"?limit="+apiCall_limit; 	
		var items_request = $.ajax({
			url: itemsURL,
			type: "GET",
			connection: "keep-alive",
			contentType: "application/json",
			"headers": _authorization
		});
			items_request.done(function (itemsCall) {
				for (var i = 0; i < itemsCall.items.length; i++)
				{
					callback(itemsCall.items[i]);
				}
				if (itemsCall.limit + itemsCall.skip <= itemsCall.totalItemsCount){
					var apiCall_skip = itemsCall.limit + itemsCall.skip;
					getAllItems(APIurl,callback,APIurl+"?limit="+apiCall_limit+"&skip="+apiCall_skip);
				}
			})
	}
	
	// Solid Meta Tags Functions
	
	function displayPages(page){
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
			$dataName = $("<td class='pageName'>"+page.name+"</td>");
			$dataTitle = $("<td class='pageTitle'>"+page.title+seoPageTitleLength+"</td>");
			$dataDescription = $("<td class='pageMetaDescription'>"+page.seoMetadataDescription+seoMetaDescriptionLength+"</td>");
			$dataURL = $("<td class='pageItemUrl'>"+page.pageUrl+" ("+page.pageUrl.length+")</td>");
			$dataDisplay = $("<td class='pageDisplay'>"+pageDisplay+"</td>");
			$dataExclude = $("<td class='pageExclude'>"+page.excludeFromSearch+"</td>");
			$dataPreview = $("<td><a target='_blank' href='"+_publicURL+page.pageUrl+"?Preview=True'>Preview</a> | <a target='_blank' href='"+_secureURL+"/Admin/WebPages_Detail.aspx?PageID="+page.id+"'>Edit</a></td>");
			$tableRow.append($dataName,$dataTitle,$dataDescription,$dataURL,$dataDisplay,$dataExclude,$dataPreview);
			$('.itemList').append($tableRow);
			if (pageDisplay == "live" && !page.excludeFromSearch)
			{
			var titleError = !checkTitle(page.title);
			if (titleError) $dataTitle.addClass("error");
			var descriptionError = !checkMetaDescription(page.seoMetadataDescription);
			if (descriptionError) $dataDescription.addClass("error");
			var URLError = !checkURL(page.pageUrl);
			if (URLError) $dataURL.addClass("error");
			if (titleError || descriptionError || URLError) $tableRow.addClass("rgWarning");
			}
		}
	}
	
	function checkTitle(title){
		if (!title){numMissingTitle++; return false;}
		else if (title.length == 0){numMissingTitle++; return false;}
		else if (title.length < 8){numTitleShort++; return false;}
		else if (title.length > _appSettings.pageTitleLength){numTitleLong++; return false;}
		else return true;
	}
	function checkMetaDescription(description){
		if (!description){numMissingDescription++; return false;}
		else if (description.length == 0){numMissingDescription++; return false;}
		else if (description.length > _appSettings.metaDescriptionLength){numDescriptionLong++}
		else return true;
	}
	function checkURL(link){
		if (!link || link.includes("/?/")){numURLBad++;return false;}
		else if (link.length > _appSettings.urlLength){numURLLong++; return false;}
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