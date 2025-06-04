import os
from flask import Flask, render_template, send_from_directory

app = Flask(__name__, static_folder='client/dist', template_folder='client/dist')
app.secret_key = os.environ.get("SESSION_SECRET")

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
