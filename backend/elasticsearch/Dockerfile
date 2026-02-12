FROM elasticsearch:8.12.0

# Install IK Analysis plugin
RUN bin/elasticsearch-plugin install --batch https://github.com/infinilabs/analysis-ik/releases/download/v8.12.0/elasticsearch-analysis-ik-8.12.0.zip

# Install STConvert (Simplified-Traditional Chinese) plugin
RUN bin/elasticsearch-plugin install --batch https://github.com/infinilabs/analysis-stconvert/releases/download/v8.12.0/elasticsearch-analysis-stconvert-8.12.0.zip
