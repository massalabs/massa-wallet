

//Messages shortcuts
function AskConfirm(message, onRes)
{
	return MessageBox(
	{
		'title': "Confirm",
		'message': message,
		'buttons': 
		{
			'Ok': () => onRes(true),
			'Cancel': () => onRes(false)
		},
		'onClose': () => onRes(false)
	});
}

function Message(mess, title, onClose)
{
	if (typeof(title) !== 'string')
	{
		onClose = title;
		title = 'Message';
	}
	if (typeof(onClose) == 'undefined')
		onClose = () => {};
	return MessageBox(
	{
		'title': title,
		'message': mess,
		'buttons': 
		{
			'Ok': onClose
		},
		'onClose': onClose
	});
}

//Message box full method
function MessageBox(options)
{
	var defaults = {
		'title': "",
		'message': "",
		'buttons': {'Ok': () => {}},
		'onClose': () => {}
	}
	options = $.extend(defaults, options);

	var boxContainer = $('.message_box_container');
	if (boxContainer.length > 0) 
		boxContainer.remove();

	//Structure
	boxContainer = $('<div class="message_box_container"></div>');
	var box = $('<div class="message_box">'
		+ '<div class="box_title">' + options.title + '</div>'
		+ '<div class="box_message">' + options.message + '</div>'
		+ '</div>');

	//Buttons
	var buttons = $('<div class="box_buttons"></div>');
	for (var key in options.buttons)
	{
		var func = options.buttons[key];
		var button = $('<button type="button" class="btn">' + key + '</button>');
		buttons.append(button);
		((button, func) => { button.click((e) => { e.stopPropagation(); if (func() !== false) boxContainer.remove(); }) })(button, func);
	}
	box.append(buttons);

	boxContainer.append(box);
	$('body').append(boxContainer);

	boxContainer.click(() => { boxContainer.remove(); options.onClose(); });
	box.click((e) => e.stopPropagation());

	return box;
}


//Format time
function FormatTime(s)
{
    s = parseFloat(s);
    var h = s < 3600 ? 0 : parseInt(s / 3600);
    s -= h * 3600;
    var m = s < 60 ? 0 : parseInt(s / 60);
	s -= m * 60;
	return (h>0?h+'h ':'') + (m>0?m+'m ':'') + s.toFixed(3) + 's';
}

//Format date
function FormatDate(timeStamp)
{
	var date = new Date(timeStamp * 1000);
	return getDigits(date.getDate()) + '/' + getDigits(date.getMonth() + 1) + '/' + date.getFullYear()
		+ ' ' + getDigits(date.getHours()) + ':' + getDigits(date.getMinutes());
}