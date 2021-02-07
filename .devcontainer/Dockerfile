FROM thevlang/vlang

# Debugger
RUN apt-get update && \
    apt-get install gdb -y

# LSP
# https://github.com/vlang/vls/issues/69
#
# RUN apt-get update && \
#     apt-get install curl -y && \
#     apt-get install unzip -y
#
# RUN curl -L -o vls.zip https://github.com/vlang/vls/archive/master.zip && \
#     unzip vls && \
#     cd vls-master && \
#     v -prod cmd/vls
